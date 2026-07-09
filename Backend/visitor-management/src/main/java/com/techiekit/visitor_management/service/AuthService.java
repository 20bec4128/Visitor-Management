package com.techiekit.visitor_management.service;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.techiekit.visitor_management.dto.BootstrapAdminResponse;
import com.techiekit.visitor_management.dto.LoginResponse;
import com.techiekit.visitor_management.entity.AppUser;
import com.techiekit.visitor_management.entity.Role;
import com.techiekit.visitor_management.repository.RoleRepository;
import com.techiekit.visitor_management.repository.UserRepository;
import com.techiekit.visitor_management.rbac.AuthTokenService;
import com.techiekit.visitor_management.rbac.PermissionCatalog;

@Service
public class AuthService {

	private static final String MANAGER_USERNAME = "manager";
	private static final String MANAGER_PASSWORD = "Manager@123";
	private static final String RECEPTIONIST_USERNAME = "receptionist";
	private static final String RECEPTIONIST_PASSWORD = "Receptionist@123";
	private static final String SECURITY_USERNAME = "security";
	private static final String SECURITY_PASSWORD = "Security@123";
	private static final String EMPLOYEE_USERNAME = "employee";
	private static final String EMPLOYEE_PASSWORD = "Employee@123";
	private static final String ADMIN_ROLE = "ADMIN";
	private static final String MANAGER_ROLE = "MANAGER";
	private static final String RECEPTIONIST_ROLE = "RECEPTIONIST";
	private static final String SECURITY_ROLE = "SECURITY";
	private static final String EMPLOYEE_ROLE = "EMPLOYEE";

	private final UserRepository userRepository;
	private final RoleRepository roleRepository;
	private final PasswordEncoder passwordEncoder;
	private final AuthTokenService authTokenService;
	private final String adminUsername;
	private final String adminPassword;

	public AuthService(UserRepository userRepository, RoleRepository roleRepository, PasswordEncoder passwordEncoder,
			AuthTokenService authTokenService,
			@Value("${app.bootstrap.admin.username:admin}") String adminUsername,
			@Value("${app.bootstrap.admin.password:Admin@123}") String adminPassword) {
		this.userRepository = userRepository;
		this.roleRepository = roleRepository;
		this.passwordEncoder = passwordEncoder;
		this.authTokenService = authTokenService;
		this.adminUsername = normalize(adminUsername);
		this.adminPassword = adminPassword;
	}

	@Transactional
	public BootstrapAdminResponse bootstrapAdmin() {
		var adminRole = ensureRole(ADMIN_ROLE, 100, PermissionCatalog.adminPermissions());
		var managerRole = ensureRole(MANAGER_ROLE, 80, PermissionCatalog.managerPermissions());
		var receptionistRole = ensureRole(RECEPTIONIST_ROLE, 60, PermissionCatalog.receptionistPermissions());
		var securityRole = ensureRole(SECURITY_ROLE, 50, PermissionCatalog.securityPermissions());
		var employeeRole = ensureRole(EMPLOYEE_ROLE, 20, PermissionCatalog.employeePermissions());

		var created = false;
		created |= ensureUser(adminUsername, adminPassword, adminRole.getTitle());
		created |= ensureUser(MANAGER_USERNAME, MANAGER_PASSWORD, managerRole.getTitle());
		created |= ensureUser(RECEPTIONIST_USERNAME, RECEPTIONIST_PASSWORD, receptionistRole.getTitle());
		created |= ensureUser(SECURITY_USERNAME, SECURITY_PASSWORD, securityRole.getTitle());
		created |= ensureUser(EMPLOYEE_USERNAME, EMPLOYEE_PASSWORD, employeeRole.getTitle());

		return new BootstrapAdminResponse(created, adminUsername, adminPassword);
	}

	public LoginResponse login(String username, String password) {
		if (username == null || password == null) {
			throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials");
		}

		var normalizedUsername = username.trim();
		var normalizedPassword = password.trim();

		var user = userRepository.findByUsernameIgnoreCase(normalizedUsername)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials"));

		if (!passwordEncoder.matches(normalizedPassword, user.getPasswordHash())) {
			throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials");
		}

		var permissions = resolvePermissions(user.getRole());
		var token = authTokenService.createToken(user.getUsername());
		return new LoginResponse(user.getUsername(), user.getRole(), token, permissions);
	}

	private Role ensureRole(String title, int level, Map<String, Boolean> defaults) {
		var normalizedTitle = normalize(title);
		var role = roleRepository.findByTitleIgnoreCaseWithPermissions(normalizedTitle).orElse(null);
		if (role == null) {
			role = new Role(normalizedTitle, level);
			applyPermissions(role, defaults);
			return roleRepository.save(role);
		}

		role.setTitle(normalizedTitle);
		role.setLevel(level);
		// Synchronize permissions to ensure any updates in PermissionCatalog are applied
		role.getPermissions().clear();
		role = roleRepository.saveAndFlush(role);
		applyPermissions(role, defaults);
		return roleRepository.save(role);
	}

	private boolean ensureUser(String username, String password, String roleTitle) {
		var normalizedUsername = normalize(username);
		var normalizedRoleTitle = normalize(roleTitle);
		var passwordHash = passwordEncoder.encode(password);

		if (userRepository.existsByUsernameIgnoreCase(normalizedUsername)) {
			var existing = userRepository.findByUsernameIgnoreCase(normalizedUsername).orElseThrow();
			existing.setUsername(normalizedUsername);
			existing.setPasswordHash(shouldForcePasswordReset(normalizedUsername)
					|| existing.getPasswordHash() == null
					|| existing.getPasswordHash().isBlank()
							? passwordHash
							: existing.getPasswordHash());
			existing.setRole(normalizedRoleTitle);
			userRepository.save(existing);
			return false;
		}

		userRepository.save(new AppUser(normalizedUsername, passwordHash, normalizedRoleTitle));
		return true;
	}

	private boolean shouldForcePasswordReset(String username) {
		return adminUsername.equalsIgnoreCase(username);
	}

	private Map<String, Boolean> resolvePermissions(String roleTitle) {
		if (PermissionCatalog.isAdmin(roleTitle)) {
			return PermissionCatalog.adminPermissions();
		}

		var role = roleRepository.findByTitleIgnoreCaseWithPermissions(roleTitle).orElse(null);
		if (role == null) {
			return Collections.emptyMap();
		}

		var out = new LinkedHashMap<String, Boolean>();
		role.getPermissions().forEach(permission -> {
			if (permission != null && permission.isAllowed() && permission.getPermissionKey() != null) {
				out.put(permission.getPermissionKey(), Boolean.TRUE);
			}
		});
		return out;
	}

	private static void applyPermissions(Role role, Map<String, Boolean> permissions) {
		if (permissions == null || permissions.isEmpty()) {
			return;
		}

		for (var entry : permissions.entrySet()) {
			if (!Boolean.TRUE.equals(entry.getValue())) {
				continue;
			}
			role.getPermissions().add(new com.techiekit.visitor_management.entity.RolePermission(role, normalize(entry.getKey()), true));
		}
	}

	private static void mergeMissingPermissions(Role role, Map<String, Boolean> defaults) {
		if (role == null || defaults == null || defaults.isEmpty()) {
			return;
		}

		var existingKeys = role.getPermissions().stream()
				.map(permission -> normalize(permission.getPermissionKey()))
				.filter(key -> !key.isBlank())
				.collect(java.util.stream.Collectors.toSet());

		for (var entry : defaults.entrySet()) {
			if (!Boolean.TRUE.equals(entry.getValue())) {
				continue;
			}
			var key = normalize(entry.getKey());
			if (key.isBlank() || existingKeys.contains(key)) {
				continue;
			}
			role.getPermissions().add(new com.techiekit.visitor_management.entity.RolePermission(role, key, true));
			existingKeys.add(key);
		}
	}

	private static String normalize(String value) {
		return value == null ? "" : value.trim();
	}
}
