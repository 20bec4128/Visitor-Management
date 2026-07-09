package com.techiekit.visitor_management.service;

import java.time.Instant;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.techiekit.visitor_management.dto.LoggedHistoryResponse;
import com.techiekit.visitor_management.entity.LoggedHistory;
import com.techiekit.visitor_management.entity.LoggedHistory.Event;
import com.techiekit.visitor_management.repository.LoggedHistoryRepository;
import com.techiekit.visitor_management.repository.UserRepository;

import jakarta.servlet.http.HttpServletRequest;

@Service
public class LoggedHistoryService {

	private final LoggedHistoryRepository loggedHistoryRepository;
	private final UserRepository userRepository;
	private final GeoIpService geoIpService;

	public LoggedHistoryService(LoggedHistoryRepository loggedHistoryRepository, UserRepository userRepository,
			GeoIpService geoIpService) {
		this.loggedHistoryRepository = loggedHistoryRepository;
		this.userRepository = userRepository;
		this.geoIpService = geoIpService;
	}

	@Transactional(readOnly = true)
	public List<LoggedHistoryResponse> list() {
		return loggedHistoryRepository.findAllByOrderByOccurredAtDesc().stream()
				.map(LoggedHistoryService::toResponse)
				.collect(Collectors.toList());
	}

	@Transactional
	public void delete(long id) {
		if (!loggedHistoryRepository.existsById(id)) {
			throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Logged history not found");
		}
		loggedHistoryRepository.deleteById(id);
	}

	@Transactional
	public void record(String username, Event event, HttpServletRequest request) {
		var normalizedUsername = normalize(username);
		if (normalizedUsername.isBlank()) {
			return;
		}

		var systemIp = getClientIp(request);
		var userAgent = request == null ? null : normalizeToNull(request.getHeader("User-Agent"));

		// Email: copy from the matching login account, if any.
		var email = userRepository.findByUsernameIgnoreCase(normalizedUsername)
				.map(user -> normalizeToNull(user.getEmail()))
				.orElse(null);

		var entry = new LoggedHistory(
				normalizedUsername,
				email,
				event,
				Instant.now(),
				systemIp,
				userAgent);

		// System: a friendly "Browser on OS" label derived from the User-Agent.
		entry.setSystem(UserAgentParser.describe(userAgent));

		// City/State/Country: best-effort GeoIP on the client IP (public IPs only).
		var geo = geoIpService.lookup(systemIp);
		entry.setCity(geo.city());
		entry.setState(geo.state());
		entry.setCountry(geo.country());

		loggedHistoryRepository.save(entry);
	}

	private static LoggedHistoryResponse toResponse(LoggedHistory entity) {
		return new LoggedHistoryResponse(
				entity.getId(),
				entity.getUsername(),
				entity.getEmail(),
				entity.getEvent(),
				entity.getOccurredAt(),
				entity.getSystemIp(),
				entity.getCity(),
				entity.getState(),
				entity.getCountry(),
				entity.getSystem());
	}

	private static String getClientIp(HttpServletRequest request) {
		if (request == null) return null;

		var xff = normalizeToNull(request.getHeader("X-Forwarded-For"));
		if (xff != null) {
			var first = xff.split(",")[0].trim();
			return first.isBlank() ? null : first;
		}
		return normalizeToNull(request.getRemoteAddr());
	}

	private static String normalize(String value) {
		return value == null ? "" : value.trim();
	}

	private static String normalizeToNull(String value) {
		var v = value == null ? "" : value.trim();
		return v.isBlank() ? null : v;
	}
}

