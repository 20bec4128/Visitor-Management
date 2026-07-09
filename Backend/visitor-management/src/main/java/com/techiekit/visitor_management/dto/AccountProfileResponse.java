package com.techiekit.visitor_management.dto;

public record AccountProfileResponse(String username, String role, String name, String email, String phone,
		String profilePhoto) {
}
