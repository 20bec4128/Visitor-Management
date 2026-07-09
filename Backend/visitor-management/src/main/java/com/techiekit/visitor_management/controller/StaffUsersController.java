package com.techiekit.visitor_management.controller;

import java.util.List;

import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.techiekit.visitor_management.dto.StaffUserCreateRequest;
import com.techiekit.visitor_management.dto.StaffUserResponse;
import com.techiekit.visitor_management.dto.StaffUserUpdateRequest;
import com.techiekit.visitor_management.rbac.RequiresPermissions;
import com.techiekit.visitor_management.rbac.PermissionCatalog;
import com.techiekit.visitor_management.service.StaffUserService;

@RestController
@RequestMapping("/api/staff/users")
public class StaffUsersController {

	private final StaffUserService staffUserService;

	public StaffUsersController(StaffUserService staffUserService) {
		this.staffUserService = staffUserService;
	}

	@GetMapping
	@RequiresPermissions({ PermissionCatalog.STAFF_USERS_VIEW })
	public List<StaffUserResponse> list() {
		return staffUserService.listUsers();
	}

	@GetMapping("/hosts")
	@RequiresPermissions({ PermissionCatalog.VISITS_CREATE, PermissionCatalog.PREREGISTER_MANAGE })
	public List<StaffUserResponse> listHosts() {
		return staffUserService.listEmployeeHosts();
	}

	@PostMapping
	@RequiresPermissions({ PermissionCatalog.STAFF_USERS_CREATE })
	public StaffUserResponse create(@RequestBody StaffUserCreateRequest request) {
		return staffUserService.create(request);
	}

	@PutMapping("/{id}")
	@RequiresPermissions({ PermissionCatalog.STAFF_USERS_EDIT })
	public StaffUserResponse update(@PathVariable Long id, @RequestBody StaffUserUpdateRequest request) {
		return staffUserService.update(id, request);
	}

	@DeleteMapping("/{id}")
	@RequiresPermissions({ PermissionCatalog.STAFF_USERS_DELETE })
	public void delete(@PathVariable Long id) {
		staffUserService.delete(id);
	}
}
