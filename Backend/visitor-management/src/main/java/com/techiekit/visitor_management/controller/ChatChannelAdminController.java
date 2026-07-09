package com.techiekit.visitor_management.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.techiekit.visitor_management.dto.ChatChannelCreateRequest;
import com.techiekit.visitor_management.dto.ChatChannelMembersRequest;
import com.techiekit.visitor_management.dto.ChatChannelResponse;
import com.techiekit.visitor_management.rbac.AuthContext;
import com.techiekit.visitor_management.rbac.PermissionCatalog;
import com.techiekit.visitor_management.rbac.RequiresPermissions;
import com.techiekit.visitor_management.service.ChatService;

/**
 * Create/delete custom chat channels. Separate from {@link ChatController} so the class-level
 * permission is **only** {@code chat.channels.manage} (admin) — required permissions are OR-combined,
 * so mixing it with {@code chat.use} on one class would let any chat user through.
 */
@RestController
@RequestMapping("/api/chat/channels")
@RequiresPermissions({ PermissionCatalog.CHAT_CHANNELS_MANAGE })
public class ChatChannelAdminController {

	private final ChatService chatService;

	public ChatChannelAdminController(ChatService chatService) {
		this.chatService = chatService;
	}

	@PostMapping
	public ChatChannelResponse create(@RequestBody ChatChannelCreateRequest request) {
		var session = AuthContext.get();
		var creator = session == null ? null : session.username();
		return chatService.createCustomChannel(
				request == null ? null : request.name(),
				creator,
				request == null ? null : request.members());
	}

	@PutMapping("/{id}/members")
	public void setMembers(@PathVariable long id, @RequestBody ChatChannelMembersRequest request) {
		chatService.setChannelMembers(id, request == null ? List.of() : request.members());
	}

	@DeleteMapping("/{id}")
	public void delete(@PathVariable long id) {
		chatService.deleteCustomChannel(id);
	}

	// Defensive: a malformed id (non-numeric) shouldn't 500.
	@org.springframework.web.bind.annotation.ExceptionHandler(NumberFormatException.class)
	public void badId() {
		throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid channel id");
	}
}
