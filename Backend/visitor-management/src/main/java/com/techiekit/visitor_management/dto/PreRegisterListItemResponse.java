package com.techiekit.visitor_management.dto;

import java.time.Instant;

public record PreRegisterListItemResponse(
		Long id,
		String status,
		Instant createdAt,
		String visitorName,
		String visitorEmail,
		String visitorPhone,
		String organizationType,
		Long hostUserId,
		String hostName,
		String hostEmail,
		String approvalToken,
		String rejectionReason) {
}
