package com.techiekit.visitor_management.controller;

import java.security.Principal;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.techiekit.visitor_management.dto.ChatChannelResponse;
import com.techiekit.visitor_management.dto.ChatContactResponse;
import com.techiekit.visitor_management.dto.ChatConversationSummary;
import com.techiekit.visitor_management.dto.ChatMessageRequest;
import com.techiekit.visitor_management.dto.ChatMessageResponse;
import com.techiekit.visitor_management.rbac.AuthContext;
import com.techiekit.visitor_management.rbac.PermissionCatalog;
import com.techiekit.visitor_management.rbac.RequiresPermissions;
import com.techiekit.visitor_management.rbac.StompPrincipal;
import com.techiekit.visitor_management.service.ChatService;

/**
 * Chat REST endpoints (contacts/channels/history/send) guarded by {@code chat.use}, plus a STOMP
 * {@code /app/chat.send} handler for the low-latency send path. Both delegate to {@link ChatService}.
 */
@RestController
@RequestMapping("/api/chat")
@RequiresPermissions({ PermissionCatalog.CHAT_USE })
public class ChatController {

	private final ChatService chatService;
	private final com.techiekit.visitor_management.service.PresenceService presenceService;

	public ChatController(ChatService chatService,
			com.techiekit.visitor_management.service.PresenceService presenceService) {
		this.chatService = chatService;
		this.presenceService = presenceService;
	}

	@GetMapping("/contacts")
	public List<ChatContactResponse> contacts() {
		return chatService.contacts(currentUsername());
	}

	@GetMapping("/channels")
	public List<ChatChannelResponse> channels() {
		return chatService.channelsFor(currentUsername(), currentRole());
	}

	@GetMapping("/conversations")
	public List<ChatConversationSummary> conversations() {
		return chatService.conversations(currentUsername(), currentRole());
	}

	/** View the members of a custom channel — allowed for the channel's members and admins. */
	@GetMapping("/channels/{id}/members")
	public List<ChatContactResponse> channelMembers(@PathVariable long id) {
		return chatService.channelMembers(id, currentUsername(), currentRole());
	}

	@GetMapping("/messages")
	public List<ChatMessageResponse> messages(@RequestParam String channel) {
		return chatService.history(channel, currentUsername(), currentRole());
	}

	@PostMapping("/messages")
	public ChatMessageResponse send(@RequestBody ChatMessageRequest request) {
		return chatService.send(request.channel(), request.body(), currentUsername(), currentRole());
	}

	/** Send a photo/document attachment (multipart). Optional {@code body} acts as a caption. */
	@PostMapping("/messages/upload")
	public ChatMessageResponse upload(
			@org.springframework.web.bind.annotation.RequestParam("channel") String channel,
			@org.springframework.web.bind.annotation.RequestParam(value = "body", required = false) String body,
			@org.springframework.web.bind.annotation.RequestParam("file") org.springframework.web.multipart.MultipartFile file) {
		return chatService.sendWithAttachment(channel, body, file, currentUsername(), currentRole());
	}

	@DeleteMapping("/messages/{id}")
	public void deleteMessage(@PathVariable long id) {
		chatService.deleteMessage(id, currentUsername(), currentRole());
	}

	/** Online usernames (users with a live WebSocket connection). */
	@GetMapping("/presence")
	public java.util.List<String> presence() {
		return presenceService.online();
	}

	/** Log a finished call as a message in the DM with the peer. */
	@PostMapping("/call-log")
	public ChatMessageResponse callLog(@RequestBody java.util.Map<String, String> body) {
		return chatService.logCall(body.get("peerUsername"), body.get("body"), currentUsername(), currentRole());
	}

	/** STOMP send path. The RBAC interceptor does not run on the WS channel, so {@code chat.use}
	 *  is enforced indirectly: only an authenticated principal can reach here. */
	@MessageMapping("/chat.send")
	public void sendOverSocket(@Payload ChatMessageRequest request, Principal principal) {
		if (!(principal instanceof StompPrincipal user)) {
			throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required");
		}
		chatService.send(request.channel(), request.body(), user.getName(), user.getRole());
	}

	private String currentUsername() {
		var session = AuthContext.get();
		if (session == null) {
			throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required");
		}
		return session.username();
	}

	private String currentRole() {
		var session = AuthContext.get();
		return session == null ? null : session.role();
	}
}
