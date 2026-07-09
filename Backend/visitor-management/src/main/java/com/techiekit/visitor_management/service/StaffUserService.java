package com.techiekit.visitor_management.service;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.techiekit.visitor_management.dto.RoleSummaryResponse;
import com.techiekit.visitor_management.dto.StaffUserCreateRequest;
import com.techiekit.visitor_management.dto.StaffUserResponse;
import com.techiekit.visitor_management.dto.StaffUserUpdateRequest;
import com.techiekit.visitor_management.entity.AppUser;
import com.techiekit.visitor_management.entity.StaffUser;
import com.techiekit.visitor_management.repository.RoleRepository;
import com.techiekit.visitor_management.repository.UserRepository;
import com.techiekit.visitor_management.repository.StaffUserRepository;
import com.techiekit.visitor_management.rbac.AuthContext;
import com.techiekit.visitor_management.rbac.PermissionCatalog;

@Service
public class StaffUserService {

	private final StaffUserRepository staffUserRepository;
	private final RoleRepository roleRepository;
	private final UserRepository userRepository;
	private final PasswordEncoder passwordEncoder;
	private final EmailTemplateService emailTemplateService;

	public StaffUserService(StaffUserRepository staffUserRepository, RoleRepository roleRepository,
			UserRepository userRepository, PasswordEncoder passwordEncoder,
			EmailTemplateService emailTemplateService) {
		this.staffUserRepository = staffUserRepository;
		this.roleRepository = roleRepository;
		this.userRepository = userRepository;
		this.passwordEncoder = passwordEncoder;
		this.emailTemplateService = emailTemplateService;
	}

	@Transactional(readOnly = true)
	public List<StaffUserResponse> listUsers() {
		return staffUserRepository.findAll().stream().map(StaffUserService::toResponse).collect(Collectors.toList());
	}

	@Transactional(readOnly = true)
	public List<StaffUserResponse> listEmployeeHosts() {
		return staffUserRepository.findAll().stream()
				.filter(StaffUserService::isEmployeeHost)
				.map(StaffUserService::toResponse)
				.collect(Collectors.toList());
	}

	@Transactional
	public StaffUserResponse create(StaffUserCreateRequest request) {
		var name = normalize(request.name());
		var email = normalize(request.email());
		var password = normalize(request.password());
		var phone = normalize(request.phone());

		if (name.isBlank()) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Name is required");
		}
		if (email.isBlank()) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email is required");
		}
		if (password.isBlank()) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Password is required");
		}
		if (staffUserRepository.existsByEmailIgnoreCase(email)) {
			throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already exists");
		}
		if (userRepository.existsByUsernameIgnoreCase(email)) {
			throw new ResponseStatusException(HttpStatus.CONFLICT, "Login username already exists");
		}

		var user = new StaffUser(name, email, passwordEncoder.encode(password), phone.isBlank() ? null : phone);

		var roleIds = request.roleIds() == null ? Collections.<Long>emptyList() : request.roleIds();
		if (roleIds.size() != 1) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Exactly one role is required");
		}
		var roles = roleRepository.findAllById(roleIds);
		if (roles.size() != 1) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid roleIds");
		}
		user.getRoles().addAll(roles);

		staffUserRepository.save(user);
		var role = roles.get(0);
		userRepository.save(new AppUser(email, passwordEncoder.encode(password), role.getTitle()));

		// Best-effort welcome email using the "New User" email template (if enabled + SMTP set).
		emailTemplateService.sendForModule("New User", email, Map.of(
				"new_user_name", name,
				"username", email,
				"password", password));

		return toResponse(user);
	}

	@Transactional
	public StaffUserResponse update(Long id, StaffUserUpdateRequest request) {
		var user = staffUserRepository.findById(id)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

		var name = normalize(request.name());
		var email = normalize(request.email());
		var phone = normalize(request.phone());
		var password = normalize(request.password());

		if (name.isBlank()) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Name is required");
		}
		if (email.isBlank()) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email is required");
		}

		if (!user.getEmail().equalsIgnoreCase(email)) {
			if (staffUserRepository.existsByEmailIgnoreCase(email)) {
				throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already exists");
			}
			if (userRepository.existsByUsernameIgnoreCase(email)) {
				throw new ResponseStatusException(HttpStatus.CONFLICT, "Login username already exists");
			}
		}

		var appUser = userRepository.findByUsernameIgnoreCase(user.getEmail())
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "AppUser not found"));

		user.setName(name);
		user.setEmail(email);
		user.setPhone(phone.isBlank() ? null : phone);

		var roleIds = request.roleIds() == null ? Collections.<Long>emptyList() : request.roleIds();
		if (roleIds.size() != 1) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Exactly one role is required");
		}
		var roles = roleRepository.findAllById(roleIds);
		if (roles.size() != 1) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid roleIds");
		}

		user.getRoles().clear();
		user.getRoles().addAll(roles);

		if (!password.isBlank()) {
			var encoded = passwordEncoder.encode(password);
			user.setPasswordHash(encoded);
			appUser.setPasswordHash(encoded);
		}

		staffUserRepository.save(user);

		var role = roles.get(0);
		appUser.setUsername(email);
		appUser.setRole(role.getTitle());
		userRepository.save(appUser);

		return toResponse(user);
	}

	/**
	 * Change a login's role app-wide, keeping {@link AppUser#role} and the {@link StaffUser}
	 * directory in sync. Used by the role-channel manager. Refuses to change your own role.
	 */
	@Transactional
	public void changeRole(String username, String roleTitle) {
		var appUser = userRepository.findByUsernameIgnoreCase(username)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found: " + username));
		var role = roleRepository.findByTitleIgnoreCase(normalize(roleTitle))
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown role: " + roleTitle));

		var session = AuthContext.get();
		if (session != null && username.equalsIgnoreCase(session.username())) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "You cannot change your own role");
		}
		if (PermissionCatalog.isAdmin(appUser.getRole()) && !PermissionCatalog.isAdmin(role.getTitle())) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Demote an admin from Staff → Users instead");
		}

		appUser.setRole(role.getTitle());
		userRepository.save(appUser);

		// Keep the staff-directory row (if any) consistent — single role, like create/update.
		staffUserRepository.findByEmailIgnoreCase(username).ifPresent(staff -> {
			staff.getRoles().clear();
			staff.getRoles().add(role);
			staffUserRepository.save(staff);
		});
	}

	@Transactional
	public void delete(Long id) {
		var user = staffUserRepository.findById(id)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

		var currentSession = AuthContext.get();
		if (currentSession != null && user.getEmail().equalsIgnoreCase(currentSession.username())) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "You cannot delete your own account");
		}

		var appUser = userRepository.findByUsernameIgnoreCase(user.getEmail());
		appUser.ifPresent(userRepository::delete);

		staffUserRepository.delete(user);
	}

	private static StaffUserResponse toResponse(StaffUser user) {
		var roles = user.getRoles().stream()
				.map(r -> new RoleSummaryResponse(r.getId(), r.getTitle()))
				.collect(Collectors.toList());

		return new StaffUserResponse(user.getId(), user.getName(), user.getEmail(), user.getPhone(), roles);
	}

	private static boolean isEmployeeHost(StaffUser user) {
		if (user == null || user.getRoles() == null || user.getRoles().isEmpty()) {
			return false;
		}
		return user.getRoles().stream()
				.anyMatch(role -> role != null && "EMPLOYEE".equalsIgnoreCase(role.getTitle()));
	}

	private static String normalize(String value) {
		return value == null ? "" : value.trim();
	}
}
