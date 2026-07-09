package com.techiekit.visitor_management.service;

import java.time.Instant;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.techiekit.visitor_management.dto.CreateVisitorRequest;
import com.techiekit.visitor_management.dto.CreateVisitorResponse;
import com.techiekit.visitor_management.dto.UpdateVisitorRequest;
import com.techiekit.visitor_management.entity.Visitor;
import com.techiekit.visitor_management.entity.VisitorFace;
import com.techiekit.visitor_management.repository.VisitorFaceRepository;
import com.techiekit.visitor_management.repository.VisitorRepository;

@Service
@Transactional
public class VisitorService {

	private final VisitorRepository visitorRepository;
	private final VisitorFaceRepository visitorFaceRepository;
	private final FaceServiceClient faceServiceClient;
	private final ObjectMapper objectMapper;

	public VisitorService(
			VisitorRepository visitorRepository,
			VisitorFaceRepository visitorFaceRepository,
			FaceServiceClient faceServiceClient,
			ObjectMapper objectMapper) {
		this.visitorRepository = visitorRepository;
		this.visitorFaceRepository = visitorFaceRepository;
		this.faceServiceClient = faceServiceClient;
		this.objectMapper = objectMapper;
	}

	public CreateVisitorResponse register(CreateVisitorRequest request) {
		if (request == null) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Request body is required");
		}

		var name = requiredTrim(request.name(), "Visitor name is required");
		var email = normalizeToNull(request.email());
		var phoneDialCode = normalizeToNull(request.phoneDialCode());
		var phoneNumber = normalizeToNull(request.phoneNumber());
		var orgType = normalizeToNull(request.organizationType());
		var companyName = normalizeToNull(request.companyName());
		var idProofType = normalizeToNull(request.idProofType());
		var idProofNumber = normalizeToNull(request.idProofNumber());
		var imageBase64 = normalizeToNull(request.imageBase64());

		var now = Instant.now();
		var entity = new Visitor();
		entity.setName(name);
		entity.setEmail(email);
		entity.setPhoneDialCode(phoneDialCode);
		entity.setPhoneNumber(phoneNumber);
		entity.setOrganizationType(orgType);
		entity.setCompanyName(companyName);
		entity.setIdProofType(idProofType);
		entity.setIdProofNumber(idProofNumber);
		entity.setCreatedAt(now);
		entity.setUpdatedAt(now);

		visitorRepository.save(entity);

		if (imageBase64 != null) {
			var embedding = faceServiceClient.encode(imageBase64);
			String embeddingJson;
			try {
				embeddingJson = objectMapper.writeValueAsString(embedding);
			} catch (Exception e) {
				throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to serialize face embedding");
			}

			var face = new VisitorFace();
			face.setVisitor(entity);
			face.setEmbeddingJson(embeddingJson);
			face.setFaceImageBase64(imageBase64);
			face.setCreatedAt(now);
			visitorFaceRepository.save(face);
		}

		return new CreateVisitorResponse(entity.getId(), entity.getName());
	}

	/**
	 * Update the editable profile fields of an existing visitor. Only non-null
	 * fields in the request are applied (so callers can send a partial update);
	 * face data is untouched.
	 */
	public Visitor update(Long id, UpdateVisitorRequest request) {
		if (request == null) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Request body is required");
		}

		var entity = visitorRepository.findById(id)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Visitor not found"));

		if (request.name() != null) {
			entity.setName(requiredTrim(request.name(), "Visitor name cannot be blank"));
		}
		if (request.email() != null) entity.setEmail(normalizeToNull(request.email()));
		if (request.phoneDialCode() != null) entity.setPhoneDialCode(normalizeToNull(request.phoneDialCode()));
		if (request.phoneNumber() != null) entity.setPhoneNumber(normalizeToNull(request.phoneNumber()));
		if (request.companyName() != null) entity.setCompanyName(normalizeToNull(request.companyName()));
		if (request.organizationType() != null) entity.setOrganizationType(normalizeToNull(request.organizationType()));
		if (request.idProofType() != null) entity.setIdProofType(normalizeToNull(request.idProofType()));
		if (request.idProofNumber() != null) entity.setIdProofNumber(normalizeToNull(request.idProofNumber()));

		entity.setUpdatedAt(Instant.now());
		visitorRepository.save(entity);
		return entity;
	}

	private static String requiredTrim(String value, String message) {
		var normalized = normalizeToNull(value);
		if (normalized == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
		return normalized;
	}

	private static String normalizeToNull(String value) {
		var v = value == null ? "" : value.trim();
		return v.isBlank() ? null : v;
	}
}
