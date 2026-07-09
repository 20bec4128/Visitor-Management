package com.techiekit.visitor_management.dto;

public record VisitorUpsertRequest(
		String name,
		String email,
		String phoneDialCode,
		String phoneNumber,
		String organizationType,
		String companyName,
		String idProofType,
		String idProofNumber) {
}

