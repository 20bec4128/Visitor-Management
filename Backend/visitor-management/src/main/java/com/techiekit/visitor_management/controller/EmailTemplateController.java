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

import com.techiekit.visitor_management.dto.EmailTemplateRequest;
import com.techiekit.visitor_management.dto.EmailTemplateResponse;
import com.techiekit.visitor_management.rbac.PermissionCatalog;
import com.techiekit.visitor_management.rbac.RequiresPermissions;
import com.techiekit.visitor_management.service.EmailTemplateService;

@RestController
@RequestMapping("/api/email-templates")
@RequiresPermissions({ PermissionCatalog.EMAIL_NOTIFICATION_MANAGE })
public class EmailTemplateController {

	private final EmailTemplateService service;

	public EmailTemplateController(EmailTemplateService service) {
		this.service = service;
	}

	@GetMapping
	public List<EmailTemplateResponse> list() {
		return service.list();
	}

	@PostMapping
	public EmailTemplateResponse create(@RequestBody EmailTemplateRequest request) {
		return service.create(request);
	}

	@PutMapping("/{id}")
	public EmailTemplateResponse update(@PathVariable long id, @RequestBody EmailTemplateRequest request) {
		return service.update(id, request);
	}

	@DeleteMapping("/{id}")
	public void delete(@PathVariable long id) {
		service.delete(id);
	}
}
