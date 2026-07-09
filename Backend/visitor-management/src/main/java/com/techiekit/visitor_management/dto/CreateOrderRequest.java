package com.techiekit.visitor_management.dto;

public record CreateOrderRequest(Integer amount, String purpose, String visitorName, String visitCategory) {
}
