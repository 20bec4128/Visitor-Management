package com.techiekit.visitor_management.dto;

public record SosResponse(Long id, String triggeredByUsername, String triggeredByName, String role, String message,
		String location, String status, String createdAt, String resolvedAt, String resolvedByUsername) {
}
