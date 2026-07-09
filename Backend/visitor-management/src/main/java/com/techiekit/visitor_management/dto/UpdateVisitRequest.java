package com.techiekit.visitor_management.dto;

public record UpdateVisitRequest(
		Long hostUserId,
		String visitAt,
		String purpose) {
}

