package com.techiekit.visitor_management.rbac;

import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessagingException;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.stereotype.Component;

import com.techiekit.visitor_management.repository.UserRepository;

/**
 * Authenticates STOMP sessions with the SAME bearer token used for REST ({@link AuthTokenService}).
 * The frontend sends {@code Authorization: Bearer <token>} in the STOMP CONNECT frame's native
 * headers; we verify it, attach a {@link StompPrincipal} to the session, and authorize every
 * SUBSCRIBE against the user's role.
 */
@Component
public class StompAuthChannelInterceptor implements ChannelInterceptor {

	private static final String ROLE_DESTINATION_PREFIX = "/topic/chat/role/";
	private static final String CUSTOM_DESTINATION_PREFIX = "/topic/chat/custom/";

	private final AuthTokenService authTokenService;
	private final UserRepository userRepository;
	private final com.techiekit.visitor_management.repository.ChatChannelRepository chatChannelRepository;

	public StompAuthChannelInterceptor(AuthTokenService authTokenService, UserRepository userRepository,
			com.techiekit.visitor_management.repository.ChatChannelRepository chatChannelRepository) {
		this.authTokenService = authTokenService;
		this.userRepository = userRepository;
		this.chatChannelRepository = chatChannelRepository;
	}

	@Override
	public Message<?> preSend(Message<?> message, MessageChannel channel) {
		var accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
		if (accessor == null || accessor.getCommand() == null) {
			return message;
		}

		var command = accessor.getCommand();
		if (StompCommand.CONNECT.equals(command)) {
			authenticate(accessor);
		} else if (StompCommand.SUBSCRIBE.equals(command)) {
			authorizeSubscription(accessor);
		}
		return message;
	}

	private void authenticate(StompHeaderAccessor accessor) {
		try {
			var header = accessor.getFirstNativeHeader("Authorization");
			var token = header != null && header.startsWith("Bearer ") ? header.substring("Bearer ".length()) : null;
			var username = authTokenService.verifyAndGetUsername(token);
			var user = userRepository.findByUsernameIgnoreCase(username)
					.orElseThrow(() -> new MessagingException("Authentication required"));
			var principal = new StompPrincipal(user.getUsername(), user.getRole());
			accessor.setUser(principal);
			var attrs = accessor.getSessionAttributes();
			if (attrs != null) {
				attrs.put("role", user.getRole());
				attrs.put("username", user.getUsername());
			}
		} catch (MessagingException e) {
			throw e;
		} catch (Exception e) {
			throw new MessagingException("Invalid auth token");
		}
	}

	private void authorizeSubscription(StompHeaderAccessor accessor) {
		var user = accessor.getUser();
		if (!(user instanceof StompPrincipal principal)) {
			throw new MessagingException("Authentication required");
		}
		var destination = accessor.getDestination();
		if (!canSubscribe(destination, principal.getName(), principal.getRole())) {
			throw new MessagingException("You are not allowed to subscribe to " + destination);
		}
	}

	private boolean canSubscribe(String destination, String username, String role) {
		if (destination == null) {
			return false;
		}
		// Per-user queues are scoped to the connected principal by Spring's user-destination handling.
		if (destination.startsWith("/user/")) {
			return true;
		}
		if (destination.equals("/topic/sos") || destination.equals("/topic/chat/all")
				|| destination.equals("/topic/chat/system") || destination.equals("/topic/presence")) {
			return true;
		}
		// Custom channels: admins, or members only.
		if (destination.startsWith(CUSTOM_DESTINATION_PREFIX)) {
			if (PermissionCatalog.isAdmin(role)) {
				return true;
			}
			try {
				var id = Long.parseLong(destination.substring(CUSTOM_DESTINATION_PREFIX.length()));
				return chatChannelRepository.isMember(id, username);
			} catch (NumberFormatException e) {
				return false;
			}
		}
		if (destination.startsWith(ROLE_DESTINATION_PREFIX)) {
			var channelRole = destination.substring(ROLE_DESTINATION_PREFIX.length());
			return PermissionCatalog.isAdmin(role) || channelRole.equalsIgnoreCase(role);
		}
		return false;
	}
}
