package com.techiekit.visitor_management.service;

import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.techiekit.visitor_management.dto.ApproveVisitRequest;
import com.techiekit.visitor_management.dto.CreateVisitorRequest;
import com.techiekit.visitor_management.dto.CreateVisitRequest;
import com.techiekit.visitor_management.dto.CreateVisitResponse;
import com.techiekit.visitor_management.dto.RejectRequest;
import com.techiekit.visitor_management.dto.UpdateVisitRequest;
import com.techiekit.visitor_management.dto.VisitRequestDetailsResponse;
import com.techiekit.visitor_management.dto.VisitRequestListItemResponse;
import com.techiekit.visitor_management.entity.VisitRequest.Status;
import com.techiekit.visitor_management.entity.StaffUser;
import com.techiekit.visitor_management.entity.VisitRequest;
import com.techiekit.visitor_management.entity.Visitor;
import com.techiekit.visitor_management.repository.PreRegisterRequestRepository;
import com.techiekit.visitor_management.entity.PreRegisterRequest;
import com.techiekit.visitor_management.repository.StaffUserRepository;
import com.techiekit.visitor_management.repository.VisitRequestRepository;
import com.techiekit.visitor_management.repository.VisitorRepository;
import com.techiekit.visitor_management.rbac.AuthContext;
import com.techiekit.visitor_management.util.PhoneFormat;

@Service
public class VisitRequestService {

	private static final Logger log = LoggerFactory.getLogger(VisitRequestService.class);

	private static final DateTimeFormatter VISIT_TIME_FMT = DateTimeFormatter
			.ofPattern("MMM dd, yyyy hh:mm a", Locale.ENGLISH).withZone(ZoneOffset.UTC);

	private final VisitorRepository visitorRepository;
	private final StaffUserRepository staffUserRepository;
	private final VisitRequestRepository visitRequestRepository;
	private final PreRegisterRequestRepository preRegisterRequestRepository;
	private final JavaMailSender mailSender;
	private final VisitorService visitorService;
	private final EmailTemplateService emailTemplateService;
	private final MailService mailService;
	private final NotificationService notificationService;

	@Value("${app.mail.from:}")
	private String mailFrom;

	public VisitRequestService(
			VisitorRepository visitorRepository,
			StaffUserRepository staffUserRepository,
			VisitRequestRepository visitRequestRepository,
			PreRegisterRequestRepository preRegisterRequestRepository,
			ObjectProvider<JavaMailSender> mailSenderProvider,
			VisitorService visitorService,
			EmailTemplateService emailTemplateService,
			MailService mailService,
			NotificationService notificationService) {
		this.visitorRepository = visitorRepository;
		this.staffUserRepository = staffUserRepository;
		this.visitRequestRepository = visitRequestRepository;
		this.preRegisterRequestRepository = preRegisterRequestRepository;
		this.mailSender = mailSenderProvider.getIfAvailable();
		this.visitorService = visitorService;
		this.emailTemplateService = emailTemplateService;
		this.mailService = mailService;
		this.notificationService = notificationService;
	}

	/**
	 * Best-effort templated email for a visit lifecycle event ("Visitor Arrival",
	 * "Host Approval", "Visitor Departure"). Never throws — a missing/disabled
	 * template or SMTP failure must not break the visit operation.
	 */
	private void sendVisitEmail(String module, String to, Visitor visitor, StaffUser host, VisitRequest entity) {
		try {
			var vars = new LinkedHashMap<String, String>();
			vars.put("visitor_name", dash(visitor == null ? null : visitor.getName()));
			vars.put("visitor_email", dash(visitor == null ? null : visitor.getEmail()));
			vars.put("host_name", dash(host == null ? null : host.getName()));
			vars.put("purpose", dash(entity.getPurpose()));
			vars.put("visit_time", entity.getVisitAt() == null ? "-" : VISIT_TIME_FMT.format(entity.getVisitAt()));
			vars.put("status", entity.getStatus() == null ? "-" : entity.getStatus().name());
			var sent = emailTemplateService.sendForModule(module, to, vars);
			if (!sent) {
				// No enabled template for this module — send a built-in default so the
				// recipient still gets notified (e.g. the visitor on host approval).
				sendDefaultVisitEmail(module, to, visitor, host, entity);
			}
		} catch (Exception e) {
			log.warn("Templated '{}' email skipped: {}", module, e.getMessage());
		}
	}

	/**
	 * Built-in fallback notification used when no enabled email template exists for the
	 * given lifecycle module. Sent via {@link MailService} (the DB-configured SMTP). Throws
	 * on failure; the caller's try/catch keeps it from breaking the visit operation.
	 */
	private void sendDefaultVisitEmail(String module, String to, Visitor visitor, StaffUser host, VisitRequest entity) {
		if (to == null || to.isBlank()) {
			return;
		}
		var visitorName = dash(visitor == null ? null : visitor.getName());
		var hostName = dash(host == null ? null : host.getName());
		var visitTime = entity.getVisitAt() == null ? "-" : VISIT_TIME_FMT.format(entity.getVisitAt());
		var purpose = dash(entity.getPurpose());

		String subject;
		String body;
		switch (module) {
			case "Host Approval" -> {
				subject = "Your visit has been approved";
				body = "Hello " + visitorName + ",\n\n"
						+ "Your visit to meet " + hostName + " has been approved.\n"
						+ "Scheduled time: " + visitTime + "\n"
						+ "Purpose: " + purpose + "\n\n"
						+ "Please carry a valid ID and report to reception on arrival.\n\n"
						+ "Thank you.";
			}
			case "Visitor Arrival" -> {
				subject = "Your visitor has arrived";
				body = "Hello " + hostName + ",\n\n"
						+ visitorName + " has checked in to meet you.\n"
						+ "Purpose: " + purpose + "\n\n"
						+ "Thank you.";
			}
			case "Visitor Departure" -> {
				subject = "Your visitor has checked out";
				body = "Hello " + hostName + ",\n\n"
						+ visitorName + " has checked out.\n\n"
						+ "Thank you.";
			}
			default -> {
				subject = "Visit update";
				body = "Hello,\n\nThere is an update on the visit for " + visitorName + ".\n\nThank you.";
			}
		}
		mailService.sendText(to, subject, body);
	}

	private static String dash(String value) {
		var v = value == null ? "" : value.trim();
		return v.isBlank() ? "-" : v;
	}

	private static String hostEmailOf(VisitRequest entity) {
		var host = entity.getHostUser();
		return host == null ? null : host.getEmail();
	}

	@Transactional(noRollbackFor = ResponseStatusException.class)
	public CreateVisitResponse create(CreateVisitRequest request) {
		if (request == null) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Request body is required");
		}

		var hostUserId = request.hostUserId();
		if (hostUserId == null) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "hostUserId is required");
		}

		var host = staffUserRepository.findById(hostUserId)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid hostUserId"));
		var hostEmail = normalizeToNull(host.getEmail());
		if (hostEmail == null) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Host email is missing");
		}

		var visitAt = parseVisitAt(request.visitAt());
		var purpose = normalizeToNull(request.purpose());
		var visitCategory = normalizeToNull(request.visitCategory());

		Visitor visitor;
		if (request.visitorId() != null) {
			visitor = visitorRepository.findById(request.visitorId())
					.orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid visitorId"));
		} else if (request.visitor() != null) {
			var v = request.visitor();
			var created = visitorService.register(new CreateVisitorRequest(
					v.name(),
					v.email(),
					v.phoneDialCode(),
					v.phoneNumber(),
					v.organizationType(),
					v.companyName(),
					v.idProofType(),
					v.idProofNumber(),
					request.imageBase64()));
			visitor = visitorRepository.findById(created.id())
					.orElseThrow(() -> new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to create visitor"));
		} else {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "visitorId or visitor is required");
		}

		String visitorEmail = null;
		Long visitorId = null;
		if (request.visitorId() != null) {
			visitorId = request.visitorId();
			visitorEmail = visitor.getEmail();
		} else if (request.visitor() != null) {
			visitorEmail = request.visitor().email();
		}
		checkActiveCheckIn(visitorId, visitorEmail);

		var entity = new VisitRequest();
		entity.setVisitor(visitor);
		entity.setHostUser(host);
		entity.setVisitAt(visitAt);
		entity.setPurpose(purpose);
		entity.setVisitCategory(visitCategory);
		entity.setPaymentId(normalizeToNull(request.paymentId()));
		entity.setStatus(Status.PENDING);
		entity.setCreatedAt(Instant.now());

		if (request.preRegisterRequestId() != null) {
			preRegisterRequestRepository.findById(request.preRegisterRequestId())
					.ifPresent(entity::setPreRegisterRequest);
		}

		if (request.factoryPurpose() != null) entity.setFactoryPurpose(request.factoryPurpose());
		if (request.factorySafetyGearRequired() != null) entity.setFactorySafetyGearRequired(request.factorySafetyGearRequired());
		if (request.factoryAreaVisiting() != null) entity.setFactoryAreaVisiting(request.factoryAreaVisiting());
		if (request.factorySupervisorName() != null) entity.setFactorySupervisorName(request.factorySupervisorName());
		if (request.factoryMaterialCarrying() != null) entity.setFactoryMaterialCarrying(request.factoryMaterialCarrying());

		visitRequestRepository.save(entity);

		try {
			sendEmail(hostEmail, host, visitor, entity);
		} catch (Exception e) {
			log.warn("Visit {} saved but notification email failed: {}", entity.getId(), e.getMessage());
		}

		return new CreateVisitResponse(
				entity.getId(),
				entity.getStatus().name(),
				entity.getVisitAt(),
				visitor.getId(),
				visitor.getName(),
				host.getId(),
				host.getName());
	}

	@Transactional(readOnly = true)
	public List<VisitRequestListItemResponse> list(String statusFilter) {
		List<VisitRequest> entities;
		if (statusFilter != null && !statusFilter.isBlank()) {
			Status status;
			try {
				status = Status.valueOf(statusFilter.trim().toUpperCase());
			} catch (IllegalArgumentException e) {
				throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid status: " + statusFilter);
			}
			entities = visitRequestRepository.findByStatusOrderByCreatedAtDesc(status);
		} else {
			entities = visitRequestRepository.findAllByOrderByCreatedAtDesc();
		}
		if (isEmployeeSession()) {
			var currentEmployeeEmail = resolveCurrentEmployeeHostEmail();
			if (currentEmployeeEmail == null) {
				return List.of();
			}
			entities = entities.stream()
					.filter(entity -> isOwnedByEmployee(entity, currentEmployeeEmail))
					.toList();
		}
		return entities.stream().map(this::toListItem).toList();
	}

	@Transactional(readOnly = true)
	public VisitRequestDetailsResponse getById(Long id) {
		var entity = visitRequestRepository.findById(id)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Visit request not found"));
		if (isEmployeeSession()) {
			var currentEmployeeEmail = resolveCurrentEmployeeHostEmail();
			if (currentEmployeeEmail == null || !isOwnedByEmployee(entity, currentEmployeeEmail)) {
				throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Visit request not found");
			}
		}
		return toDetails(entity);
	}

	private boolean isEmployeeSession() {
		var session = AuthContext.get();
		return session != null && session.role() != null && session.role().equalsIgnoreCase("EMPLOYEE");
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
				.filter(VisitRequestService::isEmployeeHostUser)
				.map(StaffUser::getEmail)
				.map(VisitRequestService::normalizeToNull)
				.orElse(null);
	}

	private static boolean isOwnedByEmployee(VisitRequest entity, String employeeEmail) {
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

	private void requireEmployeeOwnership(VisitRequest entity) {
		var session = AuthContext.get();
		if (session == null || session.role() == null) {
			return;
		}
		String role = session.role().toUpperCase();
		if (role.equals("EMPLOYEE") || role.equals("MANAGER")) {
			var currentHostEmail = resolveCurrentHostEmail();
			if (currentHostEmail == null || !isOwnedByEmployee(entity, currentHostEmail)) {
				throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Visit request not found");
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
				.map(VisitRequestService::normalizeToNull)
				.orElse(null);
	}

	@Transactional
	public VisitRequestDetailsResponse approveVisit(Long id, ApproveVisitRequest request) {
		var entity = visitRequestRepository.findById(id)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Visit request not found"));

		requireEmployeeOwnership(entity);

		if (entity.getStatus() != Status.PENDING) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only PENDING visits can be approved");
		}

		if (request != null && request.hostUserId() != null) {
			var host = staffUserRepository.findById(request.hostUserId())
					.orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid hostUserId"));
			entity.setHostUser(host);
		}

		if (request != null && request.visitAt() != null && !request.visitAt().isBlank()) {
			entity.setVisitAt(parseVisitAt(request.visitAt()));
		}

		// Walk-in flow: approval means request is accepted, but visitor is not checked in until receptionist does so.
		entity.setStatus(Status.APPROVED);
		visitRequestRepository.save(entity);

		// Notify the visitor that their visit was approved.
		sendVisitEmail("Host Approval", entity.getVisitor().getEmail(), entity.getVisitor(), entity.getHostUser(), entity);

		// Tell admins that a visit was approved (best-effort; skip if an admin approved it).
		notifyAdminsOfDecision("approved", "VISIT_APPROVED", "Walk-in visit approved",
				entity.getVisitor() == null ? null : entity.getVisitor().getName(),
				entity.getHostUser() == null ? null : entity.getHostUser().getName(), "/today-visitor");
		return toDetails(entity);
	}

	/** Best-effort admin notification when a host approves/rejects a visit. */
	private void notifyAdminsOfDecision(String verb, String type, String title, String visitorName, String hostName,
			String link) {
		try {
			var session = AuthContext.get();
			if (session != null && com.techiekit.visitor_management.rbac.PermissionCatalog.isAdmin(session.role())) {
				return; // an admin made the decision — no need to notify admins
			}
			var approver = approverName(session);
			var who = visitorName == null || visitorName.isBlank() ? "a visitor" : visitorName;
			var msg = approver + " " + verb + " " + who
					+ (hostName == null || hostName.isBlank() ? "" : " (host: " + hostName + ")");
			notificationService.notifyAdmins(type, title, msg, link);
		} catch (Exception ignored) {
			// never break the visit flow
		}
	}

	private String approverName(com.techiekit.visitor_management.rbac.AuthSession session) {
		if (session == null) {
			return "Someone";
		}
		var staff = staffUserRepository.findByEmailIgnoreCase(session.username()).orElse(null);
		if (staff != null && staff.getName() != null && !staff.getName().isBlank()) {
			return staff.getName();
		}
		return session.username();
	}

	@Transactional
	public VisitRequestDetailsResponse rejectVisit(Long id, RejectRequest request) {
		var entity = visitRequestRepository.findById(id)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Visit request not found"));

		requireEmployeeOwnership(entity);

		if (entity.getStatus() != Status.PENDING) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only PENDING visits can be rejected");
		}

		entity.setStatus(Status.REJECTED);
		entity.setRejectionReason(request == null ? null : normalizeToNull(request.reason()));
		visitRequestRepository.save(entity);

		notifyAdminsOfDecision("rejected", "VISIT_REJECTED", "Walk-in visit rejected",
				entity.getVisitor() == null ? null : entity.getVisitor().getName(),
				entity.getHostUser() == null ? null : entity.getHostUser().getName(), "/host-approvals");
		return toDetails(entity);
	}

	@Transactional
	public VisitRequestDetailsResponse checkOut(Long id) {
		var entity = visitRequestRepository.findById(id)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Visit request not found"));

		if (entity.getStatus() != Status.APPROVED && entity.getStatus() != Status.CHECKED_IN) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only APPROVED or CHECKED_IN visits can be checked out");
		}

		entity.setStatus(Status.CHECKED_OUT);
		entity.setExitTime(Instant.now());
		visitRequestRepository.save(entity);

		if (entity.getPreRegisterRequest() != null) {
			var prereg = entity.getPreRegisterRequest();
			prereg.setStatus(com.techiekit.visitor_management.entity.PreRegisterRequest.Status.CHECKED_OUT);
			preRegisterRequestRepository.save(prereg);
		}

		// Notify the host that their visitor has departed.
		sendVisitEmail("Visitor Departure", hostEmailOf(entity), entity.getVisitor(), entity.getHostUser(), entity);
		return toDetails(entity);
	}

	@Transactional
	public VisitRequestDetailsResponse checkIn(Long id) {
		var entity = visitRequestRepository.findById(id)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Visit request not found"));

		if (entity.getStatus() == Status.REJECTED || entity.getStatus() == Status.CHECKED_OUT) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot check-in a rejected/checked-out visit");
		}

		if (entity.getStatus() == Status.CHECKED_IN) {
			return toDetails(entity);
		}

		checkActiveCheckIn(entity.getVisitor().getId(), entity.getVisitor().getEmail());

		entity.setStatus(Status.CHECKED_IN);
		if (entity.getEntryTime() == null) {
			entity.setEntryTime(Instant.now());
		}
		visitRequestRepository.save(entity);

		// Notify the host that their visitor has arrived / checked in.
		sendVisitEmail("Visitor Arrival", hostEmailOf(entity), entity.getVisitor(), entity.getHostUser(), entity);
		return toDetails(entity);
	}

	@Transactional
	public VisitRequestDetailsResponse update(Long id, UpdateVisitRequest request) {
		if (request == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Request body is required");

		var entity = visitRequestRepository.findById(id)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Visit request not found"));

		if (entity.getStatus() == Status.CHECKED_OUT) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot edit a checked-out visit");
		}

		if (request.hostUserId() != null) {
			var host = staffUserRepository.findById(request.hostUserId())
					.orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid hostUserId"));
			entity.setHostUser(host);
		}

		if (request.visitAt() != null && !request.visitAt().isBlank()) {
			entity.setVisitAt(parseVisitAt(request.visitAt()));
		}

		if (request.purpose() != null) {
			entity.setPurpose(normalizeToNull(request.purpose()));
		}

		visitRequestRepository.save(entity);
		return toDetails(entity);
	}

	@Transactional
	public void delete(Long id) {
		if (!visitRequestRepository.existsById(id)) {
			throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Visit request not found");
		}
		visitRequestRepository.deleteById(id);
	}

	private void checkActiveCheckIn(Long visitorId, String email) {
		if (visitorId != null && visitRequestRepository.existsByVisitorIdAndStatus(visitorId, Status.CHECKED_IN)) {
			throw new ResponseStatusException(HttpStatus.CONFLICT, "Visitor is already checked in. Please check out first.");
		}
		var cleanEmail = email == null ? "" : email.trim();
		if (!cleanEmail.isEmpty() && visitRequestRepository.existsByVisitorEmailIgnoreCaseAndStatus(cleanEmail, Status.CHECKED_IN)) {
			throw new ResponseStatusException(HttpStatus.CONFLICT, "A visitor with this email is already checked in. Please check out first.");
		}
	}

	private VisitRequestListItemResponse toListItem(VisitRequest e) {
		var v = e.getVisitor();
		var phone = PhoneFormat.combine(v.getPhoneDialCode(), v.getPhoneNumber());
		return new VisitRequestListItemResponse(
				e.getId(),
				v.getId(),
				v.getName(),
				v.getEmail(),
				phone.isEmpty() ? null : phone,
				e.getHostUser().getName(),
				e.getHostUser().getEmail(),
				e.getVisitAt(),
				e.getStatus().name(),
				e.getEntryTime(),
				e.getExitTime(),
				e.getPurpose(),
				e.getVisitCategory(),
				e.getRejectionReason(),
				e.getCreatedAt(),
				e.getPreRegisterRequest() != null ? e.getPreRegisterRequest().getId() : null);
	}

	private VisitRequestDetailsResponse toDetails(VisitRequest e) {
		var v = e.getVisitor();
		var phone = PhoneFormat.combine(v.getPhoneDialCode(), v.getPhoneNumber());
		return new VisitRequestDetailsResponse(
				e.getId(),
				v.getId(),
				v.getName(),
				v.getEmail(),
				phone.isEmpty() ? null : phone,
				e.getHostUser().getId(),
				e.getHostUser().getName(),
				e.getVisitAt(),
				e.getStatus().name(),
				e.getEntryTime(),
				e.getExitTime(),
				e.getPurpose(),
				e.getVisitCategory(),
				e.getRejectionReason(),
				e.getFactoryPurpose(),
				e.getFactorySafetyGearRequired(),
				e.getFactoryAreaVisiting(),
				e.getFactorySupervisorName(),
				e.getFactoryMaterialCarrying(),
				e.getCreatedAt(),
				e.getPreRegisterRequest() != null ? e.getPreRegisterRequest().getId() : null);
	}

	private static Instant parseVisitAt(String raw) {
		var normalized = normalizeToNull(raw);
		if (normalized == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "visitAt is required");
		try {
			return Instant.parse(normalized);
		} catch (DateTimeParseException ignored) {
			try {
				return OffsetDateTime.parse(normalized).toInstant();
			} catch (DateTimeParseException e) {
				throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "visitAt must be an ISO timestamp");
			}
		}
	}

	private void sendEmail(String to, StaffUser host, Visitor visitor, VisitRequest request) {
		if (mailSender == null) {
			throw new IllegalStateException("SMTP is not configured (JavaMailSender bean missing)");
		}

		var message = new SimpleMailMessage();
		if (normalizeToNull(mailFrom) != null) {
			message.setFrom(mailFrom.trim());
		}
		message.setTo(to);
		message.setSubject("Visitor Approval Request: " + visitor.getName());

		var payload = Map.of(
				"visitorName", visitor.getName(),
				"visitorEmail", visitor.getEmail() == null ? "-" : visitor.getEmail(),
				"visitorPhone", PhoneFormat.combine(visitor.getPhoneDialCode(), visitor.getPhoneNumber()),
				"visitAt", request.getVisitAt().toString(),
				"purpose", request.getPurpose() == null ? "-" : request.getPurpose(),
				"host", host.getName());

		var sb = new StringBuilder();
		sb.append("Hello ").append(host.getName()).append(",\n\n");
		sb.append("A visitor is requesting approval.\n\n");
		sb.append("- Visitor Name: ").append(payload.get("visitorName")).append("\n");
		sb.append("- Email: ").append(payload.get("visitorEmail")).append("\n");
		sb.append("- Phone: ").append(payload.get("visitorPhone")).append("\n");
		sb.append("- Visit At: ").append(payload.get("visitAt")).append("\n");
		sb.append("- Purpose: ").append(payload.get("purpose")).append("\n\n");
		sb.append("Thanks,\nVisitor Management System\n");

		message.setText(sb.toString());
		mailSender.send(message);
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

}
