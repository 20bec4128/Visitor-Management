package com.techiekit.visitor_management.dto;

import java.time.Instant;

public record RecentVisitResponse(
		Long id,
		Instant visitAt,
		String status,
		String purpose,
		Long hostUserId,
		String hostName) {
}

