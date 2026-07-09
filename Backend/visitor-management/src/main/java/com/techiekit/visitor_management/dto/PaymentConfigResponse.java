package com.techiekit.visitor_management.dto;

public record PaymentConfigResponse(boolean enabled, String gateway, String keyId, String currency) {
}
