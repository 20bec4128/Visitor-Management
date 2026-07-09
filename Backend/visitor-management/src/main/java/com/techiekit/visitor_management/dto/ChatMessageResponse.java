package com.techiekit.visitor_management.dto;

public record ChatMessageResponse(Long id, String channel, String senderUsername, String senderName, String body,
		String messageType, String attachmentUrl, String attachmentName, String attachmentType, Long attachmentSize,
		String createdAt) {
}
