package com.techiekit.visitor_management.service;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.techiekit.visitor_management.dto.CreateVisitRequest;
import com.techiekit.visitor_management.dto.PreRegisterDetailsResponse;
import com.techiekit.visitor_management.dto.PreRegisterListItemResponse;
import com.techiekit.visitor_management.dto.PreRegisterQrResponse;
import com.techiekit.visitor_management.dto.PreRegisterSendRequest;
import com.techiekit.visitor_management.dto.RejectRequest;
import com.techiekit.visitor_management.dto.VisitorUpsertRequest;
import com.techiekit.visitor_management.entity.PreRegisterRequest;
import com.techiekit.visitor_management.entity.PreRegisterRequest.OrganizationType;
import com.techiekit.visitor_management.entity.PreRegisterRequest.Status;
import com.techiekit.visitor_management.entity.StaffUser;
import com.techiekit.visitor_management.repository.PreRegisterRequestRepository;
import com.techiekit.visitor_management.repository.StaffUserRepository;
import com.techiekit.visitor_management.rbac.AuthContext;
import com.techiekit.visitor_management.util.PhoneFormat;
import com.techiekit.visitor_management.util.TokenAndQRGenerator;

@Service
public class PreRegisterService {

	private static final Logger log = LoggerFactory.getLogger(PreRegisterService.class);

	private final PreRegisterRequestRepository preRegisterRequestRepository;
	private final StaffUserRepository staffUserRepository;
	private final VisitRequestService visitRequestService;
	private final NotificationService notificationService;
	private final JavaMailSender mailSender;

	@Value("${app.mail.from:}")
	private String mailFrom;

	public PreRegisterService(
			PreRegisterRequestRepository preRegisterRequestRepository,
			StaffUserRepository staffUserRepository,
			VisitRequestService visitRequestService,
			NotificationService notificationService,
			ObjectProvider<JavaMailSender> mailSenderProvider) {
		this.preRegisterRequestRepository = preRegisterRequestRepository;
		this.staffUserRepository = staffUserRepository;
		this.visitRequestService = visitRequestService;
		this.notificationService = notificationService;
		this.mailSender = mailSenderProvider.getIfAvailable();
	}

	@Transactional(readOnly = true)
	public List<PreRegisterListItemResponse> list() {
		var entities = preRegisterRequestRepository.findAllByOrderByCreatedAtDesc();
		if (isEmployeeSession()) {
			var currentEmployeeEmail = resolveCurrentEmployeeHostEmail();
			if (currentEmployeeEmail == null) {
				return List.of();
			}
			entities = entities.stream()
					.filter(entity -> isOwnedByEmployee(entity, currentEmployeeEmail))
					.collect(Collectors.toList());
		}
		return entities.stream()
				.map(PreRegisterService::toListItem)
				.collect(Collectors.toList());
	}

	@Transactional(readOnly = true)
	public PreRegisterDetailsResponse get(long id) {
		var entity = preRegisterRequestRepository.findWithHostUserById(id)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Pre-register request not found"));
		if (isEmployeeSession()) {
			var currentEmployeeEmail = resolveCurrentEmployeeHostEmail();
			if (currentEmployeeEmail == null || !isOwnedByEmployee(entity, currentEmployeeEmail)) {
				throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Pre-register request not found");
			}
		}
		return toDetails(entity);
	}

	@Transactional(readOnly = true)
	public PreRegisterDetailsResponse validateByToken(String token) {
		var normalizedToken = normalizeToNull(token);
		if (normalizedToken == null) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Token is required");
		}
		var entity = preRegisterRequestRepository.findByApprovalToken(normalizedToken)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Invalid or expired token"));
		
		// Ensure token holder is in APPROVED state (has been approved by host)
		if (entity.getStatus() != Status.APPROVED) {
			throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Token not yet approved or already used");
		}
		
		return toDetails(entity);
	}

	@Transactional(noRollbackFor = ResponseStatusException.class)
	public PreRegisterListItemResponse sendForApproval(PreRegisterSendRequest request) {
		return save(null, request);
	}

	@Transactional(noRollbackFor = ResponseStatusException.class)
	public PreRegisterListItemResponse update(long id, PreRegisterSendRequest request) {
		return save(id, request);
	}

	@Transactional
	public void delete(long id) {
		if (!preRegisterRequestRepository.existsById(id)) {
			throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Pre-register request not found");
		}
		preRegisterRequestRepository.deleteById(id);
	}

	@Transactional
	public PreRegisterListItemResponse approve(long id) {
		var entity = preRegisterRequestRepository.findWithHostUserById(id)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Pre-register request not found"));
		requireEmployeeOwnership(entity);

		// Generate unique token and QR code
		String approvalToken = TokenAndQRGenerator.generateToken();
		String qrCodeBase64 = TokenAndQRGenerator.generateQRCodeBase64(approvalToken);
		entity.setApprovalToken(approvalToken);
		
		entity.setStatus(Status.APPROVED);
		preRegisterRequestRepository.save(entity);

		// Send approval email with token and QR code
		try {
			sendApprovalEmail(entity, approvalToken, qrCodeBase64);
		} catch (Exception e) {
			log.warn("Pre-register request {} approved, but approval email delivery failed: {}", entity.getId(), e.getMessage());
		}

		notifyAdminsOfBookingDecision(entity, "approved", "BOOKING_APPROVED", "Pre-booking approved");
		return toListItem(entity);
	}

	/** Best-effort admin notification when a host approves/rejects a pre-booking (skipped if an admin did it). */
	private void notifyAdminsOfBookingDecision(com.techiekit.visitor_management.entity.PreRegisterRequest entity,
			String verb, String type, String title) {
		try {
			var session = AuthContext.get();
			if (session != null && com.techiekit.visitor_management.rbac.PermissionCatalog.isAdmin(session.role())) {
				return;
			}
			var approver = session == null ? "Someone"
					: staffUserRepository.findByEmailIgnoreCase(session.username())
							.map(s -> s.getName() == null || s.getName().isBlank() ? session.username() : s.getName())
							.orElse(session.username());
			var who = entity.getVisitorName() == null || entity.getVisitorName().isBlank()
					? "a visitor" : entity.getVisitorName();
			notificationService.notifyAdmins(type, title,
					approver + " " + verb + " the booking for " + who, "/appointment-bookings");
		} catch (Exception ignored) {
			// never break the flow
		}
	}

	/**
	 * Manual desk check-in for an approved pre-registration: creates a Visitor + VisitRequest
	 * from the stored booking data, marks the visit CHECKED_IN, and consumes the booking
	 * (status COMPLETED, token cleared) so it can't be checked in again. The new CHECKED_IN
	 * visit then surfaces a Check Out action on the visitor lists.
	 */
	@Transactional
	public PreRegisterListItemResponse checkIn(long id) {
		var entity = preRegisterRequestRepository.findWithHostUserById(id)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Pre-register request not found"));
		requireEmployeeOwnership(entity);

		if (entity.getStatus() == Status.COMPLETED) {
			throw new ResponseStatusException(HttpStatus.CONFLICT, "Visitor has already been checked in");
		}
		if (entity.getStatus() != Status.APPROVED) {
			throw new ResponseStatusException(HttpStatus.CONFLICT, "Only approved bookings can be checked in");
		}

		var visitor = new VisitorUpsertRequest(
				entity.getVisitorName(),
				entity.getEmail(),
				entity.getPhoneDialCode(),
				entity.getPhoneNumber(),
				entity.getOrganizationType() == null ? null : entity.getOrganizationType().name(),
				entity.getCompanyName(),
				entity.getIdProofType(),
				entity.getIdProofNumber());
		var createRequest = new CreateVisitRequest(
				null,
				visitor,
				entity.getHostUser().getId(),
				Instant.now().toString(),
				"Pre-registered Visitor Check-In",
				entity.getVisitCategory(),
				entity.getPaymentId(),
				null,
				entity.getFactoryPurpose(),
				entity.getFactorySafetyGearRequired(),
				entity.getFactoryAreaVisiting(),
				entity.getFactorySupervisorName(),
				entity.getFactoryMaterialCarrying(),
				entity.getId());

		var created = visitRequestService.create(createRequest);
		visitRequestService.checkIn(created.id());

		// Consume the booking so it can't be re-checked-in.
		entity.setApprovalToken(null);
		try {
			entity.setStatus(Status.COMPLETED);
			preRegisterRequestRepository.save(entity);
		} catch (DataIntegrityViolationException ex) {
			log.warn("Manual check-in succeeded but failed to persist COMPLETED status. Cause: {}", ex.getMessage());
			entity.setStatus(Status.APPROVED);
			preRegisterRequestRepository.save(entity);
		}

		return toListItem(entity);
	}

	@Transactional
	public PreRegisterListItemResponse reject(long id, RejectRequest request) {
		var entity = preRegisterRequestRepository.findWithHostUserById(id)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Pre-register request not found"));
		requireEmployeeOwnership(entity);
		entity.setStatus(Status.REJECTED);
		entity.setRejectionReason(request == null ? null : normalizeToNull(request.reason()));
		preRegisterRequestRepository.save(entity);

		notifyAdminsOfBookingDecision(entity, "rejected", "BOOKING_REJECTED", "Pre-booking rejected");
		return toListItem(entity);
	}

	@Transactional(readOnly = true)
	public PreRegisterQrResponse qrCode(long id) {
		var entity = preRegisterRequestRepository.findWithHostUserById(id)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Pre-register request not found"));
		requireEmployeeOwnership(entity);
		var token = normalizeToNull(entity.getApprovalToken());
		if (entity.getStatus() != Status.APPROVED || token == null) {
			throw new ResponseStatusException(HttpStatus.CONFLICT, "Booking has no active entry token (approve it first)");
		}
		return new PreRegisterQrResponse(entity.getId(), token, TokenAndQRGenerator.generateQRCodeBase64(token));
	}

	@Transactional
	public PreRegisterListItemResponse completeEntryByToken(String token) {
		var normalizedToken = normalizeToNull(token);
		if (normalizedToken == null) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Token is required");
		}
		
		var entity = preRegisterRequestRepository.findByApprovalToken(normalizedToken)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Invalid or expired token"));
		
		// Ensure token holder is in APPROVED state
		if (entity.getStatus() != Status.APPROVED) {
			throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Token not approved or already used");
		}

		// Consume token so it cannot be reused.
		// Some databases may have a legacy enum/check constraint that doesn't include COMPLETED; token consumption
		// still makes the entry one-time even if we can't persist the new status value.
		entity.setApprovalToken(null);
		try {
			entity.setStatus(Status.COMPLETED);
			preRegisterRequestRepository.save(entity);
		} catch (DataIntegrityViolationException ex) {
			log.warn("Failed to persist COMPLETED status for token entry (falling back to token-consumed APPROVED). Cause: {}", ex.getMessage());
			entity.setStatus(Status.APPROVED);
			preRegisterRequestRepository.save(entity);
		}
		
		return toListItem(entity);
	}

	private PreRegisterListItemResponse save(Long id, PreRegisterSendRequest request) {
		if (request == null) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Request body is required");
		}

		var visitorName = requiredTrim(request.visitorName(), "Visitor Name is required");
		var email = requiredTrim(request.email(), "Email is required");
		var phoneDialCode = requiredTrim(request.phoneDialCode(), "Phone dial code is required");
		var phoneNumber = requiredTrim(request.phoneNumber(), "Phone number is required");
		var companyName = requiredTrim(request.companyName(), "Company Name is required");
		var idProofType = requiredTrim(request.idProofType(), "ID Proof Type is required");
		var idProofNumber = requiredTrim(request.idProofNumber(), "ID Proof Number is required");
		var hostUserId = request.hostUserId();
		if (hostUserId == null) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Host is required");
		}
		var organizationType = parseOrgType(requiredTrim(request.organizationType(), "Organization Type is required"));

		var host = staffUserRepository.findById(hostUserId)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid hostUserId"));
		var hostEmail = normalizeToNull(host.getEmail());
		if (hostEmail == null) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Host email is missing");
		}

		var details = request.details() == null ? Map.<String, String>of() : request.details();
		var entity = id == null
				? new PreRegisterRequest()
				: preRegisterRequestRepository.findWithHostUserById(id)
						.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Pre-register request not found"));
		if (id == null) {
			entity.setStatus(Status.PENDING);
			entity.setCreatedAt(Instant.now());
		}
		entity.setVisitorName(visitorName);
		entity.setEmail(email);
		entity.setPhoneDialCode(phoneDialCode);
		entity.setPhoneNumber(phoneNumber);
		entity.setCompanyName(companyName);
		entity.setIdProofType(idProofType);
		entity.setIdProofNumber(idProofNumber);
		entity.setOrganizationType(organizationType);
		entity.setVisitCategory(normalizeToNull(request.visitCategory()));
		entity.setPaymentId(normalizeToNull(request.paymentId()));
		entity.setHostUser(host);

		applyOrgDetails(entity, organizationType, details);

		preRegisterRequestRepository.save(entity);

		try {
			sendEmail(hostEmail, host.getName(), entity);
		} catch (Exception e) {
			log.warn("Pre-register request {} saved, but email delivery failed: {}", entity.getId(), e.getMessage());
		}

		return toListItem(entity);
	}

	private void sendEmail(String to, String hostName, PreRegisterRequest entity) {
		if (mailSender == null) {
			throw new IllegalStateException("SMTP is not configured (JavaMailSender bean missing)");
		}
		var message = new SimpleMailMessage();
		if (normalizeToNull(mailFrom) != null) {
			message.setFrom(mailFrom.trim());
		}
		message.setTo(to);
		message.setSubject("Pre Register Approval Request: " + entity.getVisitorName());
		message.setText(buildEmailBody(hostName, entity));
		mailSender.send(message);
	}

	private void sendApprovalEmail(PreRegisterRequest entity, String token, String qrCodeBase64) {
		if (mailSender == null) {
			throw new IllegalStateException("SMTP is not configured (JavaMailSender bean missing)");
		}
		
		var htmlContent = buildApprovalEmailBody(entity, token, qrCodeBase64);
		
		var mimeMessage = mailSender.createMimeMessage();
		try {
			var helper = new org.springframework.mail.javamail.MimeMessageHelper(mimeMessage, true, "UTF-8");
			if (normalizeToNull(mailFrom) != null) {
				helper.setFrom(mailFrom.trim());
			}
			helper.setTo(entity.getEmail());
			helper.setSubject("Visit Approved: Your Entry Token and QR Code");
			helper.setText(htmlContent, true);
			// Embed the QR as a CID inline attachment — Gmail/Outlook block data: URIs,
			// but render cid: images. The body references it via <img src="cid:qrCode">.
			var pngBytes = decodeDataUri(qrCodeBase64);
			if (pngBytes != null) {
				helper.addInline("qrCode", new org.springframework.core.io.ByteArrayResource(pngBytes), "image/png");
			}
			mailSender.send(mimeMessage);
		} catch (Exception e) {
			throw new RuntimeException("Failed to send approval email", e);
		}
	}

	/** Decodes a "data:image/...;base64,XXXX" URI (or a bare base64 string) to bytes. */
	private static byte[] decodeDataUri(String dataUri) {
		if (dataUri == null || dataUri.isBlank()) {
			return null;
		}
		var base64 = dataUri.contains(",") ? dataUri.substring(dataUri.indexOf(',') + 1) : dataUri;
		try {
			return java.util.Base64.getDecoder().decode(base64);
		} catch (IllegalArgumentException e) {
			return null;
		}
	}

	private static String buildApprovalEmailBody(PreRegisterRequest entity, String token, String qrCodeBase64) {
		var sb = new StringBuilder();
		sb.append("<!DOCTYPE html>\n");
		sb.append("<html>\n");
		sb.append("<head>\n");
		sb.append("<style>\n");
		sb.append("  body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }\n");
		sb.append("  .container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px; }\n");
		sb.append("  .header { background: #4CAF50; color: white; padding: 15px; border-radius: 5px; text-align: center; margin-bottom: 20px; }\n");
		sb.append("  .content { margin: 20px 0; }\n");
		sb.append("  .token-box { background: #f0f0f0; border-left: 4px solid #4CAF50; padding: 15px; margin: 15px 0; border-radius: 3px; }\n");
		sb.append("  .token-label { font-size: 12px; color: #666; text-transform: uppercase; }\n");
		sb.append("  .token-value { font-size: 18px; font-weight: bold; color: #333; font-family: monospace; }\n");
		sb.append("  .qr-container { text-align: center; margin: 20px 0; }\n");
		sb.append("  .qr-image { max-width: 300px; height: 300px; border: 2px solid #ddd; border-radius: 5px; }\n");
		sb.append("  .details-table { width: 100%; border-collapse: collapse; margin: 15px 0; }\n");
		sb.append("  .details-table td { padding: 8px; border-bottom: 1px solid #ddd; }\n");
		sb.append("  .details-table td:first-child { font-weight: bold; width: 150px; color: #555; }\n");
		sb.append("  .footer { margin-top: 30px; padding-top: 15px; border-top: 1px solid #ddd; font-size: 12px; color: #999; text-align: center; }\n");
		sb.append("</style>\n");
		sb.append("</head>\n");
		sb.append("<body>\n");
		sb.append("<div class=\"container\">\n");
		sb.append("  <div class=\"header\">\n");
		sb.append("    <h2>Your Visit Has Been Approved!</h2>\n");
		sb.append("  </div>\n");
		
		sb.append("  <div class=\"content\">\n");
		sb.append("    <p>Dear ").append(entity.getVisitorName()).append(",</p>\n");
		sb.append("    <p>Your pre-registration visit has been approved. Please use the token code and QR code below to validate your entry.</p>\n");
		
		// Token section
		sb.append("    <div class=\"token-box\">\n");
		sb.append("      <div class=\"token-label\">Entry Token</div>\n");
		sb.append("      <div class=\"token-value\">").append(token).append("</div>\n");
		sb.append("    </div>\n");
		
		// QR Code section
		sb.append("    <div class=\"qr-container\">\n");
		sb.append("      <p><strong>Scan this QR Code at the gate:</strong></p>\n");
		sb.append("      <img src=\"cid:qrCode\" alt=\"Entry QR Code\" class=\"qr-image\">\n");
		sb.append("    </div>\n");
		
		// Visiting Details
		sb.append("    <h3>Visiting Details:</h3>\n");
		sb.append("    <table class=\"details-table\">\n");
		sb.append("      <tr>\n");
		sb.append("        <td>Visitor Name:</td>\n");
		sb.append("        <td>").append(entity.getVisitorName()).append("</td>\n");
		sb.append("      </tr>\n");
		sb.append("      <tr>\n");
		sb.append("        <td>Email:</td>\n");
		sb.append("        <td>").append(entity.getEmail()).append("</td>\n");
		sb.append("      </tr>\n");
		sb.append("      <tr>\n");
		sb.append("        <td>Phone:</td>\n");
		sb.append("        <td>").append(entity.getPhoneDialCode()).append(" ").append(entity.getPhoneNumber()).append("</td>\n");
		sb.append("      </tr>\n");
		sb.append("      <tr>\n");
		sb.append("        <td>Organization:</td>\n");
		sb.append("        <td>").append(entity.getOrganizationType()).append("</td>\n");
		sb.append("      </tr>\n");
		sb.append("      <tr>\n");
		sb.append("        <td>Company:</td>\n");
		sb.append("        <td>").append(entity.getCompanyName()).append("</td>\n");
		sb.append("      </tr>\n");
		sb.append("      <tr>\n");
		sb.append("        <td>Host:</td>\n");
		sb.append("        <td>").append(entity.getHostUser() == null ? "-" : entity.getHostUser().getName()).append("</td>\n");
		sb.append("      </tr>\n");
		sb.append("    </table>\n");
		
		sb.append("    <p><strong>Please note:</strong> Keep this token safe. You will need it to proceed with your visit. Present either the token code or scan the QR code at the gate.</p>\n");
		sb.append("  </div>\n");
		
		sb.append("  <div class=\"footer\">\n");
		sb.append("    <p>This is an automated email. Please do not reply.</p>\n");
		sb.append("    <p>Visitor Management System</p>\n");
		sb.append("  </div>\n");
		sb.append("</div>\n");
		sb.append("</body>\n");
		sb.append("</html>\n");
		
		return sb.toString();
	}

	private static String buildEmailBody(String hostName, PreRegisterRequest entity) {
		var sb = new StringBuilder();
		sb.append("Hi ").append(hostName == null ? "Host" : hostName).append(",\n\n");
		sb.append("A visitor pre-register approval is requested.\n\n");
		sb.append("Visitor Details\n");
		sb.append("- Name: ").append(entity.getVisitorName()).append("\n");
		sb.append("- Email: ").append(entity.getEmail()).append("\n");
		sb.append("- Phone: ").append(entity.getPhoneDialCode()).append(" ").append(entity.getPhoneNumber()).append("\n");
		sb.append("- Company: ").append(entity.getCompanyName()).append("\n");
		sb.append("- ID Proof: ").append(entity.getIdProofType()).append(" (").append(entity.getIdProofNumber()).append(")\n");
		sb.append("- Organization Type: ").append(entity.getOrganizationType()).append("\n\n");

		sb.append("Organization Details\n");
		switch (entity.getOrganizationType()) {
			case FACTORY -> {
				sb.append("- Purpose: ").append(nvl(entity.getFactoryPurpose())).append("\n");
				sb.append("- Safety Gear Required: ").append(boolYN(entity.getFactorySafetyGearRequired())).append("\n");
				sb.append("- Area Visiting: ").append(nvl(entity.getFactoryAreaVisiting())).append("\n");
				sb.append("- Supervisor Name: ").append(nvl(entity.getFactorySupervisorName())).append("\n");
				sb.append("- Material Carrying: ").append(boolYN(entity.getFactoryMaterialCarrying())).append("\n");
			}
			case IT_COMPANY -> {
				sb.append("- Purpose: ").append(nvl(entity.getItPurpose())).append("\n");
				sb.append("- Employee to Meet: ").append(nvl(entity.getItEmployeeToMeet())).append("\n");
				sb.append("- Meeting Room: ").append(nvl(entity.getItMeetingRoom())).append("\n");
				sb.append("- Laptop Carrying: ").append(boolYN(entity.getItLaptopCarrying())).append("\n");
				sb.append("- NDA Signed: ").append(boolYN(entity.getItNdaSigned())).append("\n");
			}
			case HOSPITAL -> {
				sb.append("- Patient Name: ").append(nvl(entity.getHospitalPatientName())).append("\n");
				sb.append("- Ward / Room: ").append(nvl(entity.getHospitalWardRoom())).append("\n");
				sb.append("- Relation: ").append(nvl(entity.getHospitalRelation())).append("\n");
				sb.append("- Visit Time Slot: ").append(nvl(entity.getHospitalVisitTimeSlot())).append("\n");
			}
			case SCHOOL -> {
				sb.append("- Student Name: ").append(nvl(entity.getSchoolStudentName())).append("\n");
				sb.append("- Class: ").append(nvl(entity.getSchoolClass())).append("\n");
				sb.append("- Reason: ").append(nvl(entity.getSchoolReason())).append("\n");
			}
		}

		sb.append("\nThanks,\nVisitor Management System\n");
		return sb.toString();
	}

	private static String boolYN(Boolean value) {
		return value == null ? "-" : (Boolean.TRUE.equals(value) ? "Yes" : "No");
	}

	private static String nvl(String value) {
		var v = normalizeToNull(value);
		return v == null ? "-" : v;
	}

	private static void applyOrgDetails(PreRegisterRequest entity, OrganizationType organizationType, Map<String, String> details) {
		switch (organizationType) {
			case FACTORY -> {
				entity.setFactoryPurpose(requiredFrom(details, "purpose", "Purpose is required"));
				entity.setFactorySafetyGearRequired(requiredBool(details, "safetyGearRequired", "Safety Gear Required is required"));
				entity.setFactoryAreaVisiting(requiredFrom(details, "areaVisiting", "Area Visiting is required"));
				entity.setFactorySupervisorName(requiredFrom(details, "supervisorName", "Supervisor Name is required"));
				entity.setFactoryMaterialCarrying(requiredBool(details, "materialCarrying", "Material Carrying is required"));
			}
			case IT_COMPANY -> {
				entity.setItPurpose(requiredFrom(details, "purpose", "Purpose is required"));
				entity.setItEmployeeToMeet(requiredFrom(details, "employeeToMeet", "Employee to Meet is required"));
				entity.setItMeetingRoom(requiredFrom(details, "meetingRoom", "Meeting Room is required"));
				entity.setItLaptopCarrying(requiredBool(details, "laptopCarrying", "Laptop Carrying is required"));
				entity.setItNdaSigned(requiredBool(details, "ndaSigned", "NDA Signed is required"));
			}
			case HOSPITAL -> {
				entity.setHospitalPatientName(requiredFrom(details, "patientName", "Patient Name is required"));
				entity.setHospitalWardRoom(requiredFrom(details, "wardRoom", "Ward / Room is required"));
				entity.setHospitalRelation(requiredFrom(details, "relation", "Relation is required"));
				entity.setHospitalVisitTimeSlot(requiredFrom(details, "visitTimeSlot", "Visit Time Slot is required"));
			}
			case SCHOOL -> {
				entity.setSchoolStudentName(requiredFrom(details, "studentName", "Student Name is required"));
				entity.setSchoolClass(requiredFrom(details, "studentClass", "Class is required"));
				entity.setSchoolReason(requiredFrom(details, "reason", "Reason is required"));
			}
		}
	}

	private static OrganizationType parseOrgType(String value) {
		var normalized = value.trim().toLowerCase();
		return switch (normalized) {
			case "factory" -> OrganizationType.FACTORY;
			case "it company", "it_company", "itcompany" -> OrganizationType.IT_COMPANY;
			case "hospital" -> OrganizationType.HOSPITAL;
			case "school" -> OrganizationType.SCHOOL;
			default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid organizationType");
		};
	}

	private static PreRegisterListItemResponse toListItem(PreRegisterRequest entity) {
		var phone = PhoneFormat.combine(entity.getPhoneDialCode(), entity.getPhoneNumber());
		return new PreRegisterListItemResponse(
				entity.getId(),
				entity.getStatus().name(),
				entity.getCreatedAt(),
				entity.getVisitorName(),
				entity.getEmail(),
				phone.trim(),
				entity.getOrganizationType().name(),
				entity.getHostUser() == null ? 0L : entity.getHostUser().getId(),
				entity.getHostUser() == null ? null : entity.getHostUser().getName(),
				entity.getHostUser() == null ? null : entity.getHostUser().getEmail(),
				entity.getApprovalToken(),
				entity.getRejectionReason());
	}

	private static PreRegisterDetailsResponse toDetails(PreRegisterRequest entity) {
		return new PreRegisterDetailsResponse(
				entity.getId(),
				entity.getStatus().name(),
				entity.getCreatedAt(),
				entity.getVisitorName(),
				entity.getEmail(),
				entity.getPhoneDialCode(),
				entity.getPhoneNumber(),
				entity.getCompanyName(),
				entity.getRejectionReason(),
				entity.getIdProofType(),
				entity.getIdProofNumber(),
				entity.getHostUser() == null ? 0L : entity.getHostUser().getId(),
				entity.getOrganizationType() == null ? null : entity.getOrganizationType().name(),
				entity.getVisitCategory(),
				toDetailsMap(entity));
	}

	private static Map<String, String> toDetailsMap(PreRegisterRequest entity) {
		var details = new LinkedHashMap<String, String>();
		if (entity.getOrganizationType() == null) return details;
		switch (entity.getOrganizationType()) {
			case FACTORY -> {
				putIfPresent(details, "purpose", entity.getFactoryPurpose());
				putIfPresent(details, "safetyGearRequired", boolYN(entity.getFactorySafetyGearRequired()));
				putIfPresent(details, "areaVisiting", entity.getFactoryAreaVisiting());
				putIfPresent(details, "supervisorName", entity.getFactorySupervisorName());
				putIfPresent(details, "materialCarrying", boolYN(entity.getFactoryMaterialCarrying()));
			}
			case IT_COMPANY -> {
				putIfPresent(details, "purpose", entity.getItPurpose());
				putIfPresent(details, "employeeToMeet", entity.getItEmployeeToMeet());
				putIfPresent(details, "meetingRoom", entity.getItMeetingRoom());
				putIfPresent(details, "laptopCarrying", boolYN(entity.getItLaptopCarrying()));
				putIfPresent(details, "ndaSigned", boolYN(entity.getItNdaSigned()));
			}
			case HOSPITAL -> {
				putIfPresent(details, "patientName", entity.getHospitalPatientName());
				putIfPresent(details, "wardRoom", entity.getHospitalWardRoom());
				putIfPresent(details, "relation", entity.getHospitalRelation());
				putIfPresent(details, "visitTimeSlot", entity.getHospitalVisitTimeSlot());
			}
			case SCHOOL -> {
				putIfPresent(details, "studentName", entity.getSchoolStudentName());
				putIfPresent(details, "studentClass", entity.getSchoolClass());
				putIfPresent(details, "reason", entity.getSchoolReason());
			}
		}
		return details;
	}

	private static void putIfPresent(Map<String, String> target, String key, String value) {
		if (normalizeToNull(value) != null) {
			target.put(key, value);
		}
	}

	private static String requiredFrom(Map<String, String> details, String key, String message) {
		var value = details.get(key);
		var normalized = normalizeToNull(value);
		if (normalized == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
		return normalized;
	}

	private static Boolean requiredBool(Map<String, String> details, String key, String message) {
		var raw = requiredFrom(details, key, message);
		var normalized = raw.trim().toLowerCase();
		if (normalized.equals("yes") || normalized.equals("true")) return Boolean.TRUE;
		if (normalized.equals("no") || normalized.equals("false")) return Boolean.FALSE;
		throw new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
	}

	private static String requiredTrim(String value, String message) {
		var normalized = normalizeToNull(value);
		if (normalized == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
		return normalized;
	}

	private static String normalizeToNull(String value) {
		var v = value == null ? "" : value.trim();
		return v.isBlank() ? null : v;
	}

	private String resolveCurrentEmployeeHostEmail() {
		var session = AuthContext.get();
		if (session == null || session.role() == null || !session.role().equalsIgnoreCase("EMPLOYEE")) {
			return null;
		}
		var username = normalizeToNull(session.username());
		if (username == null) {
			return null;
		}
		return staffUserRepository.findByEmailIgnoreCase(username)
				.filter(PreRegisterService::isEmployeeHostUser)
				.map(StaffUser::getEmail)
				.map(PreRegisterService::normalizeToNull)
				.orElse(null);
	}

	/**
	 * For an employee (host) session, ensures the request is one they host; admins and
	 * other roles (receptionist, etc.) are unaffected. Returns 404 rather than 403 so an
	 * employee can't probe which booking ids exist for other hosts.
	 */
	private void requireEmployeeOwnership(PreRegisterRequest entity) {
		var session = AuthContext.get();
		if (session == null || session.role() == null) {
			return;
		}
		String role = session.role().toUpperCase();
		if (role.equals("EMPLOYEE") || role.equals("MANAGER")) {
			var currentHostEmail = resolveCurrentHostEmail();
			if (currentHostEmail == null || !isOwnedByEmployee(entity, currentHostEmail)) {
				throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Pre-register request not found");
			}
		}
	}

	private String resolveCurrentHostEmail() {
		var session = AuthContext.get();
		if (session == null || session.role() == null) {
			return null;
		}
		String role = session.role().toUpperCase();
		if (!role.equals("EMPLOYEE") && !role.equals("MANAGER")) {
			return null;
		}
		var username = normalizeToNull(session.username());
		if (username == null) {
			return null;
		}
		return staffUserRepository.findByEmailIgnoreCase(username)
				.map(StaffUser::getEmail)
				.map(PreRegisterService::normalizeToNull)
				.orElse(null);
	}

	private boolean isEmployeeSession() {
		var session = AuthContext.get();
		return session != null && session.role() != null && session.role().equalsIgnoreCase("EMPLOYEE");
	}

	private static boolean isOwnedByEmployee(PreRegisterRequest entity, String employeeEmail) {
		if (entity == null || employeeEmail == null || entity.getHostUser() == null) {
			return false;
		}
		var hostEmail = normalizeToNull(entity.getHostUser().getEmail());
		return hostEmail != null && hostEmail.equalsIgnoreCase(employeeEmail);
	}

	private static boolean isEmployeeHostUser(StaffUser user) {
		if (user == null || user.getRoles() == null || user.getRoles().isEmpty()) {
			return false;
		}
		return user.getRoles().stream()
				.anyMatch(role -> role != null && "EMPLOYEE".equalsIgnoreCase(role.getTitle()));
	}
}
