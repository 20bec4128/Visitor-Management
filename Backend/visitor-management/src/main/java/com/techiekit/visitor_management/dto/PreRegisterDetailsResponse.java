package com.techiekit.visitor_management.dto;

import java.time.Instant;
import java.util.Map;

public record PreRegisterDetailsResponse(
		long id,
		String status,
		Instant createdAt,
		String visitorName,
		String email,
		String phoneDialCode,
		String phoneNumber,
		String companyName,
		String rejectionReason,
		String idProofType,
		String idProofNumber,
		long hostUserId,
		String organizationType,
		String visitCategory,
		Map<String, String> details) {
}
