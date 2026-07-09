package com.techiekit.visitor_management.controller;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.techiekit.visitor_management.dto.SosRequest;
import com.techiekit.visitor_management.dto.SosResponse;
import com.techiekit.visitor_management.rbac.PermissionCatalog;
import com.techiekit.visitor_management.rbac.RequiresPermissions;
import com.techiekit.visitor_management.service.SosService;

/**
 * SOS emergency alerts. Triggering needs only a valid token (everyone can raise an alarm);
 * viewing the log needs {@code sos.view} and resolving needs {@code sos.resolve}.
 */
@RestController
@RequestMapping("/api/sos")
public class SosController {

	private final SosService sosService;

	public SosController(SosService sosService) {
		this.sosService = sosService;
	}

	@PostMapping
	public SosResponse trigger(@RequestBody(required = false) SosRequest request) {
		return sosService.trigger(request);
	}

	@GetMapping
	@RequiresPermissions({ PermissionCatalog.SOS_VIEW })
	public List<SosResponse> list() {
		return sosService.list();
	}

	@PostMapping("/{id}/resolve")
	@RequiresPermissions({ PermissionCatalog.SOS_RESOLVE })
	public SosResponse resolve(@PathVariable long id) {
		return sosService.resolve(id);
	}
}
