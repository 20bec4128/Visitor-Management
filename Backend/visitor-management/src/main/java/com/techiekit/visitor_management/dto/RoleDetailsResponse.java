package com.techiekit.visitor_management.dto;

import java.util.Map;

public record RoleDetailsResponse(long id, String title, int level, Map<String, Boolean> permissions) {
}

