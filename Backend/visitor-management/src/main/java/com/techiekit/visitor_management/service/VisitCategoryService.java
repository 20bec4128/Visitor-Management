package com.techiekit.visitor_management.service;

import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.techiekit.visitor_management.dto.VisitCategoryRequest;
import com.techiekit.visitor_management.dto.VisitCategoryResponse;
import com.techiekit.visitor_management.entity.VisitCategory;
import com.techiekit.visitor_management.repository.VisitCategoryRepository;

@Service
public class VisitCategoryService {

	private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("MMM dd, yyyy", Locale.ENGLISH)
			.withZone(ZoneOffset.UTC);

	private final VisitCategoryRepository repository;

	public VisitCategoryService(VisitCategoryRepository repository) {
		this.repository = repository;
	}

	@Transactional(readOnly = true)
	public List<VisitCategoryResponse> list() {
		return repository.findAllByOrderByCreatedAtDesc().stream().map(VisitCategoryService::toResponse)
				.collect(Collectors.toList());
	}

	@Transactional
	public VisitCategoryResponse create(VisitCategoryRequest request) {
		var category = new VisitCategory();
		apply(category, request);
		category.setCreatedAt(Instant.now());
		return toResponse(repository.save(category));
	}

	@Transactional
	public VisitCategoryResponse update(long id, VisitCategoryRequest request) {
		var category = repository.findById(id)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Visit category not found"));
		apply(category, request);
		return toResponse(repository.save(category));
	}

	@Transactional
	public void delete(long id) {
		if (!repository.existsById(id)) {
			throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Visit category not found");
		}
		repository.deleteById(id);
	}

	private void apply(VisitCategory category, VisitCategoryRequest request) {
		var title = normalize(request.title());
		if (title.isBlank()) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Category title is required");
		}
		category.setTitle(title);
		// Visit Type is a free-form label (Guest, Client, Contractor, …) and the
		// fee is independent of it — a category is "paid" simply when fee > 0.
		var visitType = normalize(request.visitType());
		category.setVisitType(visitType.isBlank() ? "General" : visitType);
		var fees = request.fees() == null ? 0 : request.fees();
		category.setFees(Math.max(0, fees));
	}

	private static VisitCategoryResponse toResponse(VisitCategory c) {
		return new VisitCategoryResponse(c.getId(), c.getTitle(), c.getVisitType(), c.getFees(),
				DATE_FORMAT.format(c.getCreatedAt()));
	}

	private static String normalize(String value) {
		return value == null ? "" : value.trim();
	}
}
