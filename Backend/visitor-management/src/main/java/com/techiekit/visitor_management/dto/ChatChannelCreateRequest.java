package com.techiekit.visitor_management.dto;

import java.util.List;

public record ChatChannelCreateRequest(String name, List<String> members) {
}
