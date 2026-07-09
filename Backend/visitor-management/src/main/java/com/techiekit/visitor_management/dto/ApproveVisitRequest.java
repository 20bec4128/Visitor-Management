package com.techiekit.visitor_management.dto;

public record ApproveVisitRequest(
		Long hostUserId,
		String visitAt) {
}
