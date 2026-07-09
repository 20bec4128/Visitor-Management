package com.techiekit.visitor_management.dto;

public record NoticeResponse(long id, String title, String category, String postedBy, String date, String status,
		String description, String attachmentName) {
}
