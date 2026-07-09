package com.techiekit.visitor_management.dto;

/**
 * A conversation row for the WhatsApp-style list: the channel/DM plus a preview of its last
 * message. {@code lastActivity} (epoch millis, 0 if empty) is used by the frontend to sort
 * most-recent first.
 */
public record ChatConversationSummary(String key, String type, String label, String otherUsername,
		String lastBody, String lastSenderName, String lastSenderUsername, String lastAt, long lastActivity) {
}
