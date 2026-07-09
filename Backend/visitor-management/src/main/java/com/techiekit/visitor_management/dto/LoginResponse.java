package com.techiekit.visitor_management.dto;

import java.util.Map;

public record LoginResponse(String username, String role, String token, Map<String, Boolean> permissions) {
}
