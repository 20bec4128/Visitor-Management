package com.techiekit.visitor_management.dto;

public record PaymentResponse(long id, String gateway, String orderId, String paymentId, int amount, String currency,
		String status, String purpose, String visitorName, String visitCategory, String date) {
}
