package com.techiekit.visitor_management.rbac;

import java.security.Principal;

/**
 * Principal attached to an authenticated STOMP/WebSocket session. {@link #getName()} returns the
 * username (used by {@code convertAndSendToUser}); the role is kept for SUBSCRIBE authorization.
 */
public class StompPrincipal implements Principal {

	private final String username;
	private final String role;

	public StompPrincipal(String username, String role) {
		this.username = username;
		this.role = role;
	}

	@Override
	public String getName() {
		return username;
	}

	public String getRole() {
		return role;
	}
}
