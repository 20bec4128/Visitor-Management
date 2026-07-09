package com.techiekit.visitor_management.dto;

import java.time.Instant;

public record VisitRequestListItemResponse(
		Long id,
		Long visitorId,
		String visitorName,
		String visitorEmail,
		String visitorPhone,
		String hostName,
		String hostEmail,
		Instant visitAt,
		String status,
		Instant entryTime,
		Instant exitTime,
		String purpose,
		String visitCategory,
		String rejectionReason,
		Instant createdAt,
		Long preRegisterRequestId) {
}
