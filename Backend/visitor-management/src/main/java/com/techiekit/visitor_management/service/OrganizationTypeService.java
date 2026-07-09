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

import com.techiekit.visitor_management.dto.OrganizationTypeRequest;
import com.techiekit.visitor_management.dto.OrganizationTypeResponse;
import com.techiekit.visitor_management.entity.OrganizationType;
import com.techiekit.visitor_management.repository.OrganizationTypeRepository;

@Service
public class OrganizationTypeService {

	private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("MMM dd, yyyy", Locale.ENGLISH)
			.withZone(ZoneOffset.UTC);

	private static final List<String> DEFAULTS = List.of("Factory", "IT Company", "Hospital", "School");

	private final OrganizationTypeRepository repository;

	public OrganizationTypeService(OrganizationTypeRepository repository) {
		this.repository = repository;
	}

	@Transactional
	public List<OrganizationTypeResponse> list() {
		// Self-seed the common defaults the first time the list is requested so the
		// dropdowns are never empty on a fresh database.
		if (repository.count() == 0) {
			for (var name : DEFAULTS) {
				var t = new OrganizationType();
				t.setName(name);
				t.setCreatedAt(Instant.now());
				repository.save(t);
			}
		}
		return repository.findAllByOrderByCreatedAtAsc().stream().map(OrganizationTypeService::toResponse)
				.collect(Collectors.toList());
	}

	@Transactional
	public OrganizationTypeResponse create(OrganizationTypeRequest request) {
		var name = normalize(request == null ? null : request.name());
		if (name.isBlank()) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Organization type name is required");
		}
		if (repository.existsByNameIgnoreCase(name)) {
			throw new ResponseStatusException(HttpStatus.CONFLICT, "That organization type already exists");
		}
		var entity = new OrganizationType();
		entity.setName(name);
		entity.setCreatedAt(Instant.now());
		return toResponse(repository.save(entity));
	}

	@Transactional
	public OrganizationTypeResponse update(long id, OrganizationTypeRequest request) {
		var entity = repository.findById(id)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Organization type not found"));
		var name = normalize(request == null ? null : request.name());
		if (name.isBlank()) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Organization type name is required");
		}
		repository.findByNameIgnoreCase(name)
				.filter(other -> !other.getId().equals(id))
				.ifPresent(other -> {
					throw new ResponseStatusException(HttpStatus.CONFLICT, "That organization type already exists");
				});
		entity.setName(name);
		return toResponse(repository.save(entity));
	}

	@Transactional
	public void delete(long id) {
		if (!repository.existsById(id)) {
			throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Organization type not found");
		}
		repository.deleteById(id);
	}

	private static OrganizationTypeResponse toResponse(OrganizationType t) {
		return new OrganizationTypeResponse(t.getId(), t.getName(), DATE_FORMAT.format(t.getCreatedAt()));
	}

	private static String normalize(String value) {
		return value == null ? "" : value.trim();
	}
}
