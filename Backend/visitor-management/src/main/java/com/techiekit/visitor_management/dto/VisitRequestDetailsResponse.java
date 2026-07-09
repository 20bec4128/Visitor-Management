package com.techiekit.visitor_management.dto;

import java.time.Instant;

public record VisitRequestDetailsResponse(
		Long id,
		Long visitorId,
		String visitorName,
		String visitorEmail,
		String visitorPhone,
		Long hostUserId,
		String hostName,
		Instant visitAt,
		String status,
		Instant entryTime,
		Instant exitTime,
		String purpose,
		String visitCategory,
		String rejectionReason,
		String factoryPurpose,
		Boolean factorySafetyGearRequired,
		String factoryAreaVisiting,
		String factorySupervisorName,
		Boolean factoryMaterialCarrying,
		Instant createdAt,
		Long preRegisterRequestId) {
}
