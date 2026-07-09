package com.techiekit.visitor_management.rbac;

public final class AuthContext {

	private static final ThreadLocal<AuthSession> CURRENT = new ThreadLocal<>();

	private AuthContext() {
	}

	public static void set(AuthSession session) {
		CURRENT.set(session);
	}

	public static AuthSession get() {
		return CURRENT.get();
	}

	public static void clear() {
		CURRENT.remove();
	}
}
