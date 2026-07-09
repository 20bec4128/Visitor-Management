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

import com.techiekit.visitor_management.dto.PreRegisterDetailsResponse;
import com.techiekit.visitor_management.dto.PreRegisterListItemResponse;
import com.techiekit.visitor_management.dto.PreRegisterQrResponse;
import com.techiekit.visitor_management.dto.PreRegisterSendRequest;
import com.techiekit.visitor_management.dto.RejectRequest;
import com.techiekit.visitor_management.rbac.AnonymousAccess;
import com.techiekit.visitor_management.rbac.PermissionCatalog;
import com.techiekit.visitor_management.rbac.RequiresPermissions;
import com.techiekit.visitor_management.service.PreRegisterService;

@RestController
@RequestMapping("/api/visitor/pre-register")
public class VisitorPreRegisterController {

	private final PreRegisterService preRegisterService;

	public VisitorPreRegisterController(PreRegisterService preRegisterService) {
		this.preRegisterService = preRegisterService;
	}

	@GetMapping
	@RequiresPermissions({ PermissionCatalog.PREREGISTER_VIEW })
	public List<PreRegisterListItemResponse> list() {
		return preRegisterService.list();
	}

	@GetMapping("/{id}")
	@RequiresPermissions({ PermissionCatalog.PREREGISTER_VIEW })
	public PreRegisterDetailsResponse get(@PathVariable long id) {
		return preRegisterService.get(id);
	}

	@GetMapping("/{id}/qr")
	@RequiresPermissions({ PermissionCatalog.PREREGISTER_VIEW })
	public PreRegisterQrResponse qrCode(@PathVariable long id) {
		return preRegisterService.qrCode(id);
	}

	@PostMapping("/send")
	@RequiresPermissions({ PermissionCatalog.PREREGISTER_MANAGE })
	public PreRegisterListItemResponse sendForApproval(@RequestBody PreRegisterSendRequest request) {
		return preRegisterService.sendForApproval(request);
	}

	@PutMapping("/{id}")
	@RequiresPermissions({ PermissionCatalog.PREREGISTER_MANAGE })
	public PreRegisterListItemResponse update(@PathVariable long id, @RequestBody PreRegisterSendRequest request) {
		return preRegisterService.update(id, request);
	}

	@DeleteMapping("/{id}")
	@RequiresPermissions({ PermissionCatalog.PREREGISTER_MANAGE })
	public void delete(@PathVariable long id) {
		preRegisterService.delete(id);
	}

	@PostMapping("/{id}/approve")
	@RequiresPermissions({ PermissionCatalog.PREREGISTER_APPROVE })
	public PreRegisterListItemResponse approve(@PathVariable long id) {
		return preRegisterService.approve(id);
	}

	@PostMapping("/{id}/reject")
	@RequiresPermissions({ PermissionCatalog.PREREGISTER_REJECT })
	public PreRegisterListItemResponse reject(@PathVariable long id, @RequestBody(required = false) RejectRequest request) {
		return preRegisterService.reject(id, request);
	}

	@PostMapping("/{id}/checkin")
	@RequiresPermissions({ PermissionCatalog.VISITS_CHECKIN })
	public PreRegisterListItemResponse checkIn(@PathVariable long id) {
		return preRegisterService.checkIn(id);
	}

	@GetMapping("/validate/{token}")
	@AnonymousAccess
	public PreRegisterDetailsResponse validateByToken(@PathVariable String token) {
		return preRegisterService.validateByToken(token);
	}

	@PostMapping("/{token}/complete-entry")
	@AnonymousAccess
	public PreRegisterListItemResponse completeEntryByToken(@PathVariable String token) {
		return preRegisterService.completeEntryByToken(token);
	}
}
