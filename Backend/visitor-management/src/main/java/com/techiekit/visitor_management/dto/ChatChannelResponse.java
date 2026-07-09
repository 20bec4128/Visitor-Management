package com.techiekit.visitor_management.dto;

/**
 * A channel the caller may use. {@code key} is the stored channel id (e.g. {@code all},
 * {@code role:SECURITY}); {@code destination} is the STOMP topic to subscribe to.
 */
public record ChatChannelResponse(String key, String label, String destination) {
}
