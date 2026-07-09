package com.techiekit.visitor_management.dto;

import java.time.Instant;

public record CreateVisitResponse(
		Long id,
		String status,
		Instant visitAt,
		Long visitorId,
		String visitorName,
		Long hostUserId,
		String hostName) {
}

