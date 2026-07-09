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

import com.techiekit.visitor_management.dto.RoleDetailsResponse;
import com.techiekit.visitor_management.dto.RoleListItemResponse;
import com.techiekit.visitor_management.dto.RoleUpsertRequest;
import com.techiekit.visitor_management.rbac.PermissionCatalog;
import com.techiekit.visitor_management.rbac.RequiresPermissions;
import com.techiekit.visitor_management.service.RoleService;

@RestController
@RequestMapping("/api/staff/roles")
public class StaffRolesController {

	private final RoleService roleService;

	public StaffRolesController(RoleService roleService) {
		this.roleService = roleService;
	}

	@GetMapping
	@RequiresPermissions({ PermissionCatalog.STAFF_ROLES_VIEW })
	public List<RoleListItemResponse> list() {
		return roleService.listRoles();
	}

	@GetMapping("/{id}")
	@RequiresPermissions({ PermissionCatalog.STAFF_ROLES_VIEW })
	public RoleDetailsResponse get(@PathVariable long id) {
		return roleService.getRole(id);
	}

	@PostMapping
	@RequiresPermissions({ PermissionCatalog.STAFF_ROLES_MANAGE })
	public RoleDetailsResponse create(@RequestBody RoleUpsertRequest request) {
		return roleService.create(request);
	}

	@PutMapping("/{id}")
	@RequiresPermissions({ PermissionCatalog.STAFF_ROLES_MANAGE })
	public RoleDetailsResponse update(@PathVariable long id, @RequestBody RoleUpsertRequest request) {
		return roleService.update(id, request);
	}

	@DeleteMapping("/{id}")
	@RequiresPermissions({ PermissionCatalog.STAFF_ROLES_MANAGE })
	public void delete(@PathVariable long id) {
		roleService.delete(id);
	}
}
