package com.techiekit.visitor_management.dto;

public record UpdateVisitorRequest(
		String name,
		String email,
		String phoneDialCode,
		String phoneNumber,
		String companyName,
		String organizationType,
		String idProofType,
		String idProofNumber) {
}
