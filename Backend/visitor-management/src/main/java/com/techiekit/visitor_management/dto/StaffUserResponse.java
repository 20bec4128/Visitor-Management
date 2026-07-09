package com.techiekit.visitor_management.dto;

import java.util.List;

public record StaffUserResponse(long id, String name, String email, String phone, List<RoleSummaryResponse> roles) {
}

