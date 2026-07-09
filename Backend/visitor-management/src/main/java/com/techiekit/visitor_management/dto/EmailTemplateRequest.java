package com.techiekit.visitor_management.dto;

public record EmailTemplateRequest(String module, String subject, String message, Boolean enabled) {
}
