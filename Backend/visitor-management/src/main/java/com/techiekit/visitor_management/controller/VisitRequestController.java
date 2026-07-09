package com.techiekit.visitor_management.controller;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.DeleteMapping;

import com.techiekit.visitor_management.dto.ApproveVisitRequest;
import com.techiekit.visitor_management.dto.CreateVisitRequest;
import com.techiekit.visitor_management.dto.CreateVisitResponse;
import com.techiekit.visitor_management.dto.RejectRequest;
import com.techiekit.visitor_management.dto.UpdateVisitRequest;
import com.techiekit.visitor_management.dto.VisitRequestDetailsResponse;
import com.techiekit.visitor_management.dto.VisitRequestListItemResponse;
import com.techiekit.visitor_management.rbac.PermissionCatalog;
import com.techiekit.visitor_management.rbac.RequiresPermissions;
import com.techiekit.visitor_management.service.VisitRequestService;

@RestController
@RequestMapping("/api/visits")
public class VisitRequestController {

	private final VisitRequestService visitRequestService;

	public VisitRequestController(VisitRequestService visitRequestService) {
		this.visitRequestService = visitRequestService;
	}

	@PostMapping
	@RequiresPermissions({ PermissionCatalog.VISITS_CREATE })
	public CreateVisitResponse create(@RequestBody CreateVisitRequest request) {
		return visitRequestService.create(request);
	}

	@GetMapping
	@RequiresPermissions({ PermissionCatalog.VISITS_VIEW })
	public List<VisitRequestListItemResponse> list(@RequestParam(required = false) String status) {
		return visitRequestService.list(status);
	}

	@GetMapping("/{id}")
	@RequiresPermissions({ PermissionCatalog.VISITS_VIEW })
	public VisitRequestDetailsResponse getById(@PathVariable Long id) {
		return visitRequestService.getById(id);
	}

	@PostMapping("/{id}/approve")
	@RequiresPermissions({ PermissionCatalog.VISITS_APPROVE })
	public VisitRequestDetailsResponse approve(@PathVariable Long id, @RequestBody(required = false) ApproveVisitRequest request) {
		return visitRequestService.approveVisit(id, request);
	}

	@PostMapping("/{id}/reject")
	@RequiresPermissions({ PermissionCatalog.VISITS_REJECT })
	public VisitRequestDetailsResponse reject(@PathVariable Long id, @RequestBody(required = false) RejectRequest request) {
		return visitRequestService.rejectVisit(id, request);
	}

	@PostMapping("/{id}/checkout")
	@RequiresPermissions({ PermissionCatalog.VISITS_CHECKOUT })
	public VisitRequestDetailsResponse checkout(@PathVariable Long id) {
		return visitRequestService.checkOut(id);
	}

	@PostMapping("/{id}/checkin")
	@RequiresPermissions({ PermissionCatalog.VISITS_CHECKIN })
	public VisitRequestDetailsResponse checkin(@PathVariable Long id) {
		return visitRequestService.checkIn(id);
	}

	@PutMapping("/{id}")
	@RequiresPermissions({ PermissionCatalog.VISITS_EDIT })
	public VisitRequestDetailsResponse update(@PathVariable Long id, @RequestBody UpdateVisitRequest request) {
		return visitRequestService.update(id, request);
	}

	@DeleteMapping("/{id}")
	@RequiresPermissions({ PermissionCatalog.VISITS_DELETE })
	public void delete(@PathVariable Long id) {
		visitRequestService.delete(id);
	}
}
