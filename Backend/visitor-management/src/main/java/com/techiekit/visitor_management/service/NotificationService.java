package com.techiekit.visitor_management.service;

import java.util.List;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.techiekit.visitor_management.dto.NotificationResponse;
import com.techiekit.visitor_management.entity.Notification;
import com.techiekit.visitor_management.repository.NotificationRepository;
import com.techiekit.visitor_management.repository.UserRepository;

/**
 * Persists per-user notifications and pushes them live over STOMP to the recipient's
 * {@code /user/queue/notifications}. Best-effort — never breaks the triggering flow.
 */
@Service
public class NotificationService {

	private final NotificationRepository notificationRepository;
	private final UserRepository userRepository;
	private final SimpMessagingTemplate messagingTemplate;

	public NotificationService(NotificationRepository notificationRepository, UserRepository userRepository,
			SimpMessagingTemplate messagingTemplate) {
		this.notificationRepository = notificationRepository;
		this.userRepository = userRepository;
		this.messagingTemplate = messagingTemplate;
	}

	@Transactional
	public void notify(String recipientUsername, String type, String title, String message, String link) {
		if (recipientUsername == null || recipientUsername.isBlank()) {
			return;
		}
		var n = new Notification();
		n.setRecipientUsername(recipientUsername);
		n.setType(type);
		n.setTitle(title);
		n.setMessage(message);
		n.setLink(link);
		var saved = notificationRepository.save(n);
		try {
			messagingTemplate.convertAndSendToUser(recipientUsername, "/queue/notifications", toResponse(saved));
		} catch (Exception ignored) {
			// live push is best-effort; the row is persisted for the bell either way
		}
	}

	/** Notify every admin account. */
	@Transactional
	public void notifyAdmins(String type, String title, String message, String link) {
		for (var admin : userRepository.findByRoleIgnoreCase("ADMIN")) {
			notify(admin.getUsername(), type, title, message, link);
		}
	}

	@Transactional(readOnly = true)
	public List<NotificationResponse> list(String username) {
		return notificationRepository.findTop50ByRecipientUsernameIgnoreCaseOrderByCreatedAtDesc(username).stream()
				.map(this::toResponse).toList();
	}

	@Transactional
	public void markAllRead(String username) {
		notificationRepository.markAllRead(username);
	}

	@Transactional
	public void markRead(long id, String username) {
		notificationRepository.markAsRead(id, username);
	}

	private NotificationResponse toResponse(Notification n) {
		return new NotificationResponse(n.getId(), n.getType(), n.getTitle(), n.getMessage(), n.getLink(),
				n.isRead(), n.getCreatedAt().toString());
	}
}
