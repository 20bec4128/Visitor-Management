package com.techiekit.visitor_management.dto;

import java.util.Map;

public record CurrentUserResponse(String username, String role, Map<String, Boolean> permissions) {
}
