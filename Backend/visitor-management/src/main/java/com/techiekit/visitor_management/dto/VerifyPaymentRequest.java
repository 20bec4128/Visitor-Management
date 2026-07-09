package com.techiekit.visitor_management.dto;

public record VerifyPaymentRequest(String orderId, String paymentId, String signature, Integer amount,
		String purpose, String visitorName, String visitCategory) {
}
