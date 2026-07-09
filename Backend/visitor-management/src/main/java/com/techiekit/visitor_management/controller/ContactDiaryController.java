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

import com.techiekit.visitor_management.dto.ContactDiaryRequest;
import com.techiekit.visitor_management.dto.ContactDiaryResponse;
import com.techiekit.visitor_management.rbac.PermissionCatalog;
import com.techiekit.visitor_management.rbac.RequiresPermissions;
import com.techiekit.visitor_management.service.ContactDiaryService;

@RestController
@RequestMapping("/api/contact-diary")
@RequiresPermissions({ PermissionCatalog.CONTACT_VIEW })
public class ContactDiaryController {

	private final ContactDiaryService service;

	public ContactDiaryController(ContactDiaryService service) {
		this.service = service;
	}

	@GetMapping
	public List<ContactDiaryResponse> list() {
		return service.list();
	}

	@PostMapping
	public ContactDiaryResponse create(@RequestBody ContactDiaryRequest request) {
		return service.create(request);
	}

	@PutMapping("/{id}")
	public ContactDiaryResponse update(@PathVariable long id, @RequestBody ContactDiaryRequest request) {
		return service.update(id, request);
	}

	@DeleteMapping("/{id}")
	public void delete(@PathVariable long id) {
		service.delete(id);
	}
}
