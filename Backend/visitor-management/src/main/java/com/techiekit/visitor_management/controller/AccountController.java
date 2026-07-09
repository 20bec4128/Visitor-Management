package com.techiekit.visitor_management.controller;

import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import com.techiekit.visitor_management.dto.AccountProfileRequest;
import com.techiekit.visitor_management.dto.AccountProfileResponse;
import com.techiekit.visitor_management.dto.ChangePasswordRequest;
import com.techiekit.visitor_management.entity.AppUser;
import com.techiekit.visitor_management.rbac.AuthContext;
import com.techiekit.visitor_management.repository.UserRepository;
import com.techiekit.visitor_management.service.FileStorageService;

@RestController
@RequestMapping("/api/account")
public class AccountController {

	private final UserRepository userRepository;
	private final PasswordEncoder passwordEncoder;
	private final FileStorageService fileStorageService;

	public AccountController(UserRepository userRepository, PasswordEncoder passwordEncoder,
			FileStorageService fileStorageService) {
		this.userRepository = userRepository;
		this.passwordEncoder = passwordEncoder;
		this.fileStorageService = fileStorageService;
	}

	@GetMapping("/me")
	public AccountProfileResponse me() {
		return toResponse(currentUser());
	}

	@PutMapping("/profile")
	@Transactional
	public AccountProfileResponse updateProfile(@RequestBody AccountProfileRequest request) {
		var user = currentUser();
		user.setName(normalizeToNull(request.name()));
		user.setEmail(normalizeToNull(request.email()));
		user.setPhone(normalizeToNull(request.phone()));
		userRepository.save(user);
		return toResponse(user);
	}

	@PostMapping("/profile/photo")
	@Transactional
	public AccountProfileResponse uploadPhoto(@RequestParam("file") MultipartFile file) {
		var user = currentUser();
		var url = fileStorageService.storeImage(file, "profile");
		user.setProfilePhoto(url);
		userRepository.save(user);
		return toResponse(user);
	}

	@PostMapping("/password")
	@Transactional
	public void changePassword(@RequestBody ChangePasswordRequest request) {
		var user = currentUser();
		var current = request.currentPassword() == null ? "" : request.currentPassword();
		var next = request.newPassword() == null ? "" : request.newPassword().trim();

		if (!passwordEncoder.matches(current, user.getPasswordHash())) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Current password is incorrect");
		}
		if (next.length() < 6) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "New password must be at least 6 characters");
		}
		user.setPasswordHash(passwordEncoder.encode(next));
		userRepository.save(user);
	}

	private AppUser currentUser() {
		var session = AuthContext.get();
		var username = session == null ? null : session.username();
		if (username == null || username.isBlank()) {
			throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Not authenticated");
		}
		return userRepository.findByUsernameIgnoreCase(username)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
	}

	private static AccountProfileResponse toResponse(AppUser user) {
		return new AccountProfileResponse(user.getUsername(), user.getRole(), user.getName(), user.getEmail(),
				user.getPhone(), user.getProfilePhoto());
	}

	private static String normalizeToNull(String value) {
		if (value == null) {
			return null;
		}
		var trimmed = value.trim();
		return trimmed.isBlank() ? null : trimmed;
	}
}
