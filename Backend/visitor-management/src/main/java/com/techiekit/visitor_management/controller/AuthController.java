package com.techiekit.visitor_management.controller;

import jakarta.servlet.http.HttpServletRequest;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.techiekit.visitor_management.dto.BootstrapAdminResponse;
import com.techiekit.visitor_management.dto.CurrentUserResponse;
import com.techiekit.visitor_management.dto.LoginRequest;
import com.techiekit.visitor_management.dto.LoginResponse;
import com.techiekit.visitor_management.dto.LogoutRequest;
import com.techiekit.visitor_management.entity.LoggedHistory.Event;
import com.techiekit.visitor_management.rbac.AnonymousAccess;
import com.techiekit.visitor_management.rbac.AuthContext;
import com.techiekit.visitor_management.service.AuthService;
import com.techiekit.visitor_management.service.LoggedHistoryService;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

	private final AuthService authService;
	private final LoggedHistoryService loggedHistoryService;

	public AuthController(AuthService authService, LoggedHistoryService loggedHistoryService) {
		this.authService = authService;
		this.loggedHistoryService = loggedHistoryService;
	}

	@PostMapping("/bootstrap-admin")
	@AnonymousAccess
	public BootstrapAdminResponse bootstrapAdmin() {
		return authService.bootstrapAdmin();
	}

	@PostMapping("/login")
	@AnonymousAccess
	public LoginResponse login(@RequestBody LoginRequest request, HttpServletRequest httpRequest) {
		var response = authService.login(request.username(), request.password());
		loggedHistoryService.record(response.username(), Event.LOGIN, httpRequest);
		return response;
	}

	@PostMapping("/logout")
	@AnonymousAccess
	public void logout(@RequestBody LogoutRequest request, HttpServletRequest httpRequest) {
		var username = request == null ? null : request.username();
		loggedHistoryService.record(username, Event.LOGOUT, httpRequest);
	}

	// Returns the authenticated user's current role + permissions (freshly resolved by the
	// interceptor). The frontend calls this on load so role/permission changes take effect
	// without forcing a re-login. Requires only a valid token (no specific permission).
	@GetMapping("/me")
	public CurrentUserResponse me() {
		var session = AuthContext.get();
		if (session == null) {
			throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Not authenticated");
		}
		return new CurrentUserResponse(session.username(), session.role(), session.permissions());
	}
}
