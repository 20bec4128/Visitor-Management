package com.techiekit.visitor_management.service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.techiekit.visitor_management.dto.RoleDetailsResponse;
import com.techiekit.visitor_management.dto.RoleListItemResponse;
import com.techiekit.visitor_management.dto.RoleUpsertRequest;
import com.techiekit.visitor_management.entity.Role;
import com.techiekit.visitor_management.entity.RolePermission;
import com.techiekit.visitor_management.repository.RoleRepository;

@Service
public class RoleService {

	private final RoleRepository roleRepository;

	public RoleService(RoleRepository roleRepository) {
		this.roleRepository = roleRepository;
	}

	@Transactional(readOnly = true)
	public List<RoleListItemResponse> listRoles() {
		var roles = roleRepository.findAll();
		var counts = new HashMap<Long, Long>();
		for (var row : roleRepository.countUsersPerRole()) {
			if (row != null && row.length >= 2 && row[0] != null) {
				counts.put(((Number) row[0]).longValue(), row[1] == null ? 0L : ((Number) row[1]).longValue());
			}
		}

		return roles.stream()
				.map(r -> new RoleListItemResponse(r.getId(), r.getTitle(), r.getLevel(), counts.getOrDefault(r.getId(), 0L)))
				.collect(Collectors.toList());
	}

	@Transactional(readOnly = true)
	public RoleDetailsResponse getRole(long id) {
		var role = roleRepository.findById(id)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Role not found"));

		var permissions = new HashMap<String, Boolean>();
		for (RolePermission p : role.getPermissions()) {
			permissions.put(p.getPermissionKey(), p.isAllowed());
		}
		return new RoleDetailsResponse(role.getId(), role.getTitle(), role.getLevel(), permissions);
	}

	@Transactional
	public RoleDetailsResponse create(RoleUpsertRequest request) {
		var title = normalize(request.title());
		if (title.isBlank()) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Role title is required");
		}
		if (roleRepository.existsByTitleIgnoreCase(title)) {
			throw new ResponseStatusException(HttpStatus.CONFLICT, "Role title already exists");
		}

		int level = request.level() != null ? request.level() : roleRepository.findMaxLevel() + 1;
		var role = new Role(title, level);
		applyPermissions(role, request.permissions());
		roleRepository.save(role);
		return getRole(role.getId());
	}

	@Transactional
	public RoleDetailsResponse update(long id, RoleUpsertRequest request) {
		var role = roleRepository.findById(id)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Role not found"));

		var title = normalize(request.title());
		if (title.isBlank()) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Role title is required");
		}

		var existing = roleRepository.findByTitleIgnoreCase(title);
		if (existing.isPresent() && !existing.get().getId().equals(role.getId())) {
			throw new ResponseStatusException(HttpStatus.CONFLICT, "Role title already exists");
		}

		role.setTitle(title);
		if (request.level() != null) {
			role.setLevel(request.level());
		}
		reconcilePermissions(role, request.permissions());
		roleRepository.save(role);
		return getRole(role.getId());
	}

	@Transactional
	public void delete(long id) {
		if (!roleRepository.existsById(id)) {
			throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Role not found");
		}

		if (roleRepository.hasAnyUsers(id)) {
			throw new ResponseStatusException(HttpStatus.CONFLICT, "Role is assigned to users");
		}

		roleRepository.deleteById(id);
	}

	private void applyPermissions(Role role, Map<String, Boolean> permissions) {
		if (permissions == null || permissions.isEmpty()) {
			return;
		}

		var existingKeys = role.getPermissions().stream()
				.map(permission -> normalize(permission.getPermissionKey()))
				.filter(key -> !key.isBlank())
				.collect(Collectors.toSet());

		for (var entry : permissions.entrySet()) {
			var key = normalize(entry.getKey());
			if (key.isBlank()) {
				continue;
			}
			boolean allowed = Boolean.TRUE.equals(entry.getValue());
			if (!allowed || existingKeys.contains(key)) {
				continue;
			}
			role.getPermissions().add(new RolePermission(role, key, true));
			existingKeys.add(key);
		}
	}

	private void reconcilePermissions(Role role, Map<String, Boolean> permissions) {
		if (role == null) {
			return;
		}

		if (permissions == null) {
			role.getPermissions().clear();
			return;
		}

		var requestedAllowed = permissions.entrySet().stream()
				.filter(entry -> Boolean.TRUE.equals(entry.getValue()))
				.map(Map.Entry::getKey)
				.map(RoleService::normalize)
				.filter(key -> !key.isBlank())
				.collect(Collectors.toSet());

		role.getPermissions().removeIf(permission -> {
			var key = normalize(permission.getPermissionKey());
			return key.isBlank() || !requestedAllowed.contains(key);
		});

		var existingByKey = role.getPermissions().stream()
				.collect(Collectors.toMap(permission -> normalize(permission.getPermissionKey()), permission -> permission, (left, right) -> left));

		for (var key : requestedAllowed) {
			var existing = existingByKey.get(key);
			if (existing != null) {
				existing.setAllowed(true);
				continue;
			}
			role.getPermissions().add(new RolePermission(role, key, true));
		}
	}

	private static String normalize(String value) {
		return value == null ? "" : value.trim();
	}
}
