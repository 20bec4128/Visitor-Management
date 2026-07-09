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

import com.techiekit.visitor_management.dto.OrganizationTypeRequest;
import com.techiekit.visitor_management.dto.OrganizationTypeResponse;
import com.techiekit.visitor_management.rbac.PermissionCatalog;
import com.techiekit.visitor_management.rbac.RequiresPermissions;
import com.techiekit.visitor_management.service.OrganizationTypeService;

@RestController
@RequestMapping("/api/organization-types")
public class OrganizationTypeController {

	private final OrganizationTypeService service;

	public OrganizationTypeController(OrganizationTypeService service) {
		this.service = service;
	}

	// Listing is open to any authenticated user — receptionists/security need it
	// to populate the Organization Type dropdown when creating visits/bookings.
	@GetMapping
	public List<OrganizationTypeResponse> list() {
		return service.list();
	}

	@PostMapping
	@RequiresPermissions({ PermissionCatalog.ORGANIZATION_TYPE_MANAGE })
	public OrganizationTypeResponse create(@RequestBody OrganizationTypeRequest request) {
		return service.create(request);
	}

	@PutMapping("/{id}")
	@RequiresPermissions({ PermissionCatalog.ORGANIZATION_TYPE_MANAGE })
	public OrganizationTypeResponse update(@PathVariable long id, @RequestBody OrganizationTypeRequest request) {
		return service.update(id, request);
	}

	@DeleteMapping("/{id}")
	@RequiresPermissions({ PermissionCatalog.ORGANIZATION_TYPE_MANAGE })
	public void delete(@PathVariable long id) {
		service.delete(id);
	}
}
