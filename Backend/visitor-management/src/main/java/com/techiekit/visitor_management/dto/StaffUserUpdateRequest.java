package com.techiekit.visitor_management.dto;

import java.util.List;

public record StaffUserUpdateRequest(String name, String email, String password, String phone, List<Long> roleIds) {
}
