package com.techiekit.visitor_management.dto;

public record ContactDiaryResponse(long id, String visitor, String contactPerson, String phone, String purpose,
		String date, String status) {
}
