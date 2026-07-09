package com.techiekit.visitor_management.dto;

import java.util.Map;

public record PreRegisterSendRequest(
		String visitorName,
		String email,
		String phoneDialCode,
		String phoneNumber,
		String companyName,
		String idProofType,
		String idProofNumber,
		Long hostUserId,
		String organizationType,
		String visitCategory,
		String paymentId,
		Map<String, String> details) {
}

