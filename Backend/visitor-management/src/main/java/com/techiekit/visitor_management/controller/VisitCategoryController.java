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

import com.techiekit.visitor_management.dto.VisitCategoryRequest;
import com.techiekit.visitor_management.dto.VisitCategoryResponse;
import com.techiekit.visitor_management.rbac.PermissionCatalog;
import com.techiekit.visitor_management.rbac.RequiresPermissions;
import com.techiekit.visitor_management.service.VisitCategoryService;

@RestController
@RequestMapping("/api/visit-categories")
@RequiresPermissions({ PermissionCatalog.VISIT_CATEGORY_MANAGE })
public class VisitCategoryController {

	private final VisitCategoryService service;

	public VisitCategoryController(VisitCategoryService service) {
		this.service = service;
	}

	@GetMapping
	public List<VisitCategoryResponse> list() {
		return service.list();
	}

	@PostMapping
	public VisitCategoryResponse create(@RequestBody VisitCategoryRequest request) {
		return service.create(request);
	}

	@PutMapping("/{id}")
	public VisitCategoryResponse update(@PathVariable long id, @RequestBody VisitCategoryRequest request) {
		return service.update(id, request);
	}

	@DeleteMapping("/{id}")
	public void delete(@PathVariable long id) {
		service.delete(id);
	}
}
