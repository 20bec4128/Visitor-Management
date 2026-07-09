package com.techiekit.visitor_management.dto;

import java.time.Instant;

import com.techiekit.visitor_management.entity.LoggedHistory.Event;

public record LoggedHistoryResponse(
		long id,
		String username,
		String email,
		Event event,
		Instant occurredAt,
		String systemIp,
		String city,
		String state,
		String country,
		String system) {
}

