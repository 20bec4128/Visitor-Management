package com.techiekit.visitor_management.controller;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.techiekit.visitor_management.dto.CreateVisitorRequest;
import com.techiekit.visitor_management.dto.CreateVisitorResponse;
import com.techiekit.visitor_management.dto.UpdateVisitorRequest;
import com.techiekit.visitor_management.entity.Visitor;
import com.techiekit.visitor_management.repository.VisitorRepository;
import com.techiekit.visitor_management.rbac.PermissionCatalog;
import com.techiekit.visitor_management.rbac.RequiresPermissions;
import com.techiekit.visitor_management.service.VisitorService;

@RestController
@RequestMapping("/api/visitors")
public class VisitorController {

	private final VisitorService visitorService;
	private final VisitorRepository visitorRepository;

	public VisitorController(VisitorService visitorService, VisitorRepository visitorRepository) {
		this.visitorService = visitorService;
		this.visitorRepository = visitorRepository;
	}

	@PostMapping
	@ResponseStatus(HttpStatus.CREATED)
	@RequiresPermissions({ PermissionCatalog.VISITORS_CREATE })
	public CreateVisitorResponse create(@RequestBody CreateVisitorRequest request) {
		return visitorService.register(request);
	}

	@GetMapping("/{id}")
	@RequiresPermissions({ PermissionCatalog.VISITORS_VIEW })
	public Visitor getById(@PathVariable Long id) {
		return visitorRepository.findById(id)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Visitor not found"));
	}

	@PutMapping("/{id}")
	@RequiresPermissions({ PermissionCatalog.VISITORS_EDIT })
	public Visitor update(@PathVariable Long id, @RequestBody UpdateVisitorRequest request) {
		return visitorService.update(id, request);
	}
}
