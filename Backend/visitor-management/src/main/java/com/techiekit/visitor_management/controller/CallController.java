package com.techiekit.visitor_management.controller;

import java.security.Principal;
import java.util.ArrayList;
import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.techiekit.visitor_management.dto.CallSignal;
import com.techiekit.visitor_management.dto.IceServer;
import com.techiekit.visitor_management.dto.IceServersResponse;
import com.techiekit.visitor_management.rbac.PermissionCatalog;
import com.techiekit.visitor_management.rbac.RequiresPermissions;
import com.techiekit.visitor_management.rbac.StompPrincipal;
import com.techiekit.visitor_management.repository.UserRepository;

/**
 * WebRTC support: exposes ICE-server config (STUN/TURN from env) over REST and relays peer
 * signaling messages between two users over STOMP. No media or signaling state is persisted.
 */
@RestController
@RequestMapping("/api/calls")
public class CallController {

	private final SimpMessagingTemplate messagingTemplate;
	private final UserRepository userRepository;

	@Value("${webrtc.stun.urls:stun:stun.l.google.com:19302}")
	private String stunUrls;

	@Value("${webrtc.turn.url:}")
	private String turnUrl;

	@Value("${webrtc.turn.username:}")
	private String turnUsername;

	@Value("${webrtc.turn.credential:}")
	private String turnCredential;

	public CallController(SimpMessagingTemplate messagingTemplate, UserRepository userRepository) {
		this.messagingTemplate = messagingTemplate;
		this.userRepository = userRepository;
	}

	@GetMapping("/ice-servers")
	@RequiresPermissions({ PermissionCatalog.CHAT_USE })
	public IceServersResponse iceServers() {
		var servers = new ArrayList<IceServer>();
		var stun = splitCsv(stunUrls);
		if (!stun.isEmpty()) {
			servers.add(new IceServer(stun, null, null));
		}
		if (turnUrl != null && !turnUrl.isBlank()) {
			servers.add(new IceServer(splitCsv(turnUrl), emptyToNull(turnUsername), emptyToNull(turnCredential)));
		}
		return new IceServersResponse(servers);
	}

	/** Relay an offer/answer/ICE/control message to the {@code to} user, stamping a trusted sender. */
	@MessageMapping("/call.signal")
	public void signal(@Payload CallSignal signal, Principal principal) {
		if (!(principal instanceof StompPrincipal user)) {
			throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required");
		}
		if (signal == null || signal.to() == null || signal.to().isBlank()) {
			return;
		}
		var relayed = new CallSignal(signal.type(), signal.to(), user.getName(), senderName(user.getName()),
				signal.mode(), signal.payload());
		messagingTemplate.convertAndSendToUser(signal.to(), "/queue/call", relayed);
	}

	private String senderName(String username) {
		return userRepository.findByUsernameIgnoreCase(username)
				.map(u -> u.getName() != null && !u.getName().isBlank() ? u.getName() : u.getUsername())
				.orElse(username);
	}

	private static List<String> splitCsv(String csv) {
		var out = new ArrayList<String>();
		if (csv == null) {
			return out;
		}
		for (var part : csv.split(",")) {
			var trimmed = part == null ? "" : part.trim();
			if (!trimmed.isEmpty()) {
				out.add(trimmed);
			}
		}
		return out;
	}

	private static String emptyToNull(String v) {
		return v == null || v.isBlank() ? null : v;
	}
}
