package com.techiekit.visitor_management.dto;

public record CreateVisitRequest(
		Long visitorId,
		VisitorUpsertRequest visitor,
		Long hostUserId,
		String visitAt,
		String purpose,
		String visitCategory,
		String paymentId,
		String imageBase64,
		String factoryPurpose,
		Boolean factorySafetyGearRequired,
		String factoryAreaVisiting,
		String factorySupervisorName,
		Boolean factoryMaterialCarrying,
		Long preRegisterRequestId) {
}

