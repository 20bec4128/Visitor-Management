package com.techiekit.visitor_management.dto;

public record MatchedVisitorResponse(
		Long id,
		String name,
		String email,
		String phoneDialCode,
		String phoneNumber,
		String organizationType,
		String companyName,
		String idProofType,
		String idProofNumber) {
}

