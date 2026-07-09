package com.techiekit.visitor_management.dto;

public record ChangePasswordRequest(String currentPassword, String newPassword) {
}
