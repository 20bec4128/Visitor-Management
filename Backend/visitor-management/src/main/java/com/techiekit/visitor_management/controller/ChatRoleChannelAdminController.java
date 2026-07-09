package com.techiekit.visitor_management.controller;

import java.util.List;

import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.techiekit.visitor_management.dto.ChatChannelMembersRequest;
import com.techiekit.visitor_management.rbac.PermissionCatalog;
import com.techiekit.visitor_management.rbac.RequiresPermissions;
import com.techiekit.visitor_management.service.ChatService;

/**
 * Manage the membership of a role channel (e.g. "Manager Team") by promoting/demoting users.
 * Admin-only — these operations change the target user's role across the whole app.
 */
@RestController
@RequestMapping("/api/chat/role-channels")
@RequiresPermissions({ PermissionCatalog.CHAT_CHANNELS_MANAGE })
public class ChatRoleChannelAdminController {

	private final ChatService chatService;

	public ChatRoleChannelAdminController(ChatService chatService) {
		this.chatService = chatService;
	}

	@PutMapping("/{role}/members")
	public void setMembers(@PathVariable String role, @RequestBody ChatChannelMembersRequest request) {
		chatService.setRoleChannelMembers(role, request == null ? List.of() : request.members());
	}
}
