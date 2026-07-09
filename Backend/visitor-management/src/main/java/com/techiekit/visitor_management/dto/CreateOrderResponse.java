package com.techiekit.visitor_management.dto;

public record CreateOrderResponse(String orderId, String keyId, long amount, String currency, String gateway) {
}
