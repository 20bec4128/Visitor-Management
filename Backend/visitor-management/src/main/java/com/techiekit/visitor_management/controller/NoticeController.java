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

import com.techiekit.visitor_management.dto.NoticeRequest;
import com.techiekit.visitor_management.dto.NoticeResponse;
import com.techiekit.visitor_management.rbac.PermissionCatalog;
import com.techiekit.visitor_management.rbac.RequiresPermissions;
import com.techiekit.visitor_management.service.NoticeService;

@RestController
@RequestMapping("/api/notices")
@RequiresPermissions({ PermissionCatalog.NOTICE_VIEW })
public class NoticeController {

	private final NoticeService service;

	public NoticeController(NoticeService service) {
		this.service = service;
	}

	@GetMapping
	public List<NoticeResponse> list() {
		return service.list();
	}

	@PostMapping
	@RequiresPermissions({ PermissionCatalog.NOTICE_MANAGE })
	public NoticeResponse create(@RequestBody NoticeRequest request) {
		return service.create(request);
	}

	@PutMapping("/{id}")
	@RequiresPermissions({ PermissionCatalog.NOTICE_MANAGE })
	public NoticeResponse update(@PathVariable long id, @RequestBody NoticeRequest request) {
		return service.update(id, request);
	}

	@DeleteMapping("/{id}")
	@RequiresPermissions({ PermissionCatalog.NOTICE_MANAGE })
	public void delete(@PathVariable long id) {
		service.delete(id);
	}
}
