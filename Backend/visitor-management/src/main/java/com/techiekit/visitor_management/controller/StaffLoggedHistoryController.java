package com.techiekit.visitor_management.controller;

import java.util.List;

import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.techiekit.visitor_management.dto.LoggedHistoryResponse;
import com.techiekit.visitor_management.rbac.PermissionCatalog;
import com.techiekit.visitor_management.rbac.RequiresPermissions;
import com.techiekit.visitor_management.service.LoggedHistoryService;

@RestController
@RequestMapping("/api/staff/logged-history")
public class StaffLoggedHistoryController {

	private final LoggedHistoryService loggedHistoryService;

	public StaffLoggedHistoryController(LoggedHistoryService loggedHistoryService) {
		this.loggedHistoryService = loggedHistoryService;
	}

	@GetMapping
	@RequiresPermissions({ PermissionCatalog.STAFF_LOGGED_HISTORY_VIEW })
	public List<LoggedHistoryResponse> list() {
		return loggedHistoryService.list();
	}

	@DeleteMapping("/{id}")
	@RequiresPermissions({ PermissionCatalog.STAFF_LOGGED_HISTORY_DELETE })
	public void delete(@PathVariable long id) {
		loggedHistoryService.delete(id);
	}
}
