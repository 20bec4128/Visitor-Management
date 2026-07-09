package com.techiekit.visitor_management.dto;

import java.util.Map;

public record RoleUpsertRequest(String title, Integer level, Map<String, Boolean> permissions) {
}

