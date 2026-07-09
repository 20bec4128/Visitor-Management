package com.techiekit.visitor_management.controller;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.techiekit.visitor_management.dto.FaceMatchRequest;
import com.techiekit.visitor_management.dto.FaceMatchResponse;
import com.techiekit.visitor_management.rbac.PermissionCatalog;
import com.techiekit.visitor_management.rbac.RequiresPermissions;
import com.techiekit.visitor_management.service.VisitorFaceMatchService;

@RestController
@RequestMapping("/api/visitors/face")
public class VisitorFaceController {

	private final VisitorFaceMatchService visitorFaceMatchService;

	public VisitorFaceController(VisitorFaceMatchService visitorFaceMatchService) {
		this.visitorFaceMatchService = visitorFaceMatchService;
	}

	@PostMapping("/match")
	@RequiresPermissions({ PermissionCatalog.VISITORS_FACE_MATCH })
	public FaceMatchResponse match(@RequestBody FaceMatchRequest request) {
		return visitorFaceMatchService.match(request == null ? null : request.imageBase64());
	}
}
