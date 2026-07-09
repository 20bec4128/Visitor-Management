package com.techiekit.visitor_management.dto;

public record EmailTemplateResponse(long id, String module, String subject, String message, boolean enabled,
		String date) {
}
