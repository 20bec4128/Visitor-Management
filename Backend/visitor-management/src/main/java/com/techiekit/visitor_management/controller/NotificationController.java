package com.techiekit.visitor_management.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.techiekit.visitor_management.dto.NotificationResponse;
import com.techiekit.visitor_management.rbac.AuthContext;
import com.techiekit.visitor_management.service.NotificationService;

/** In-app notifications for the current user. Any authenticated user may read their own. */
@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

	private final NotificationService notificationService;

	public NotificationController(NotificationService notificationService) {
		this.notificationService = notificationService;
	}

	@GetMapping
	public List<NotificationResponse> list() {
		return notificationService.list(currentUsername());
	}

	@PostMapping("/read-all")
	public void markAllRead() {
		notificationService.markAllRead(currentUsername());
	}

	@PostMapping("/{id}/read")
	public void markRead(@PathVariable Long id) {
		notificationService.markRead(id, currentUsername());
	}

	private String currentUsername() {
		var session = AuthContext.get();
		if (session == null) {
			throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required");
		}
		return session.username();
	}
}
