package com.techiekit.visitor_management.service;

import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;

import org.springframework.http.HttpStatus;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.techiekit.visitor_management.dto.SosRequest;
import com.techiekit.visitor_management.dto.SosResponse;
import com.techiekit.visitor_management.entity.SosAlert;
import com.techiekit.visitor_management.rbac.AuthContext;
import com.techiekit.visitor_management.repository.SosAlertRepository;
import com.techiekit.visitor_management.repository.UserRepository;

/** Raises, lists and resolves SOS alerts. A new alert is broadcast to everyone on {@code /topic/sos}. */
@Service
public class SosService {

	private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter
			.ofPattern("MMM dd, yyyy hh:mm a", Locale.ENGLISH).withZone(ZoneOffset.UTC);

	private final SosAlertRepository sosAlertRepository;
	private final UserRepository userRepository;
	private final SimpMessagingTemplate messagingTemplate;

	public SosService(SosAlertRepository sosAlertRepository, UserRepository userRepository,
			SimpMessagingTemplate messagingTemplate) {
		this.sosAlertRepository = sosAlertRepository;
		this.userRepository = userRepository;
		this.messagingTemplate = messagingTemplate;
	}

	@Transactional
	public SosResponse trigger(SosRequest request) {
		var session = AuthContext.get();
		if (session == null) {
			throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required");
		}
		var alert = new SosAlert();
		alert.setTriggeredByUsername(session.username());
		alert.setTriggeredByName(displayName(session.username()));
		alert.setRole(session.role());
		alert.setMessage(request == null ? null : trimToNull(request.message()));
		alert.setLocation(request == null ? null : trimToNull(request.location()));
		alert.setStatus("ACTIVE");
		var saved = sosAlertRepository.save(alert);

		var response = toResponse(saved);
		messagingTemplate.convertAndSend("/topic/sos", response);
		return response;
	}

	@Transactional(readOnly = true)
	public List<SosResponse> list() {
		return sosAlertRepository.findAllByOrderByCreatedAtDesc().stream().map(this::toResponse).toList();
	}

	@Transactional
	public SosResponse resolve(long id) {
		var session = AuthContext.get();
		var alert = sosAlertRepository.findById(id)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Alert not found"));
		if (!"RESOLVED".equals(alert.getStatus())) {
			alert.setStatus("RESOLVED");
			alert.setResolvedAt(Instant.now());
			alert.setResolvedByUsername(session == null ? null : session.username());
			alert = sosAlertRepository.save(alert);
		}
		var response = toResponse(alert);
		// Let every client clear the active banner.
		messagingTemplate.convertAndSend("/topic/sos", response);
		return response;
	}

	private String displayName(String username) {
		return userRepository.findByUsernameIgnoreCase(username)
				.map(u -> u.getName() != null && !u.getName().isBlank() ? u.getName() : u.getUsername())
				.orElse(username);
	}

	private static String trimToNull(String v) {
		if (v == null) {
			return null;
		}
		var t = v.trim();
		return t.isEmpty() ? null : t;
	}

	private SosResponse toResponse(SosAlert a) {
		return new SosResponse(a.getId(), a.getTriggeredByUsername(), a.getTriggeredByName(), a.getRole(),
				a.getMessage(), a.getLocation(), a.getStatus(), DATE_FORMAT.format(a.getCreatedAt()),
				a.getResolvedAt() == null ? null : DATE_FORMAT.format(a.getResolvedAt()), a.getResolvedByUsername());
	}
}
