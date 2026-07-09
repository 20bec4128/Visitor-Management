package com.techiekit.visitor_management.dto;

public record NotificationResponse(Long id, String type, String title, String message, String link, boolean read,
		String createdAt) {
}
