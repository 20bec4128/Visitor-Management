package com.techiekit.visitor_management.dto;

public record ContactDiaryRequest(String visitor, String contactPerson, String phone, String purpose, String status) {
}
