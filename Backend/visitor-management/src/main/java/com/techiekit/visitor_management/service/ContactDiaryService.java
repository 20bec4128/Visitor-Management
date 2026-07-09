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

import com.techiekit.visitor_management.dto.ContactDiaryRequest;
import com.techiekit.visitor_management.dto.ContactDiaryResponse;
import com.techiekit.visitor_management.entity.ContactDiaryEntry;
import com.techiekit.visitor_management.rbac.AuthContext;
import com.techiekit.visitor_management.repository.ContactDiaryRepository;
import com.techiekit.visitor_management.repository.StaffUserRepository;

@Service
public class ContactDiaryService {

	private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("MMM dd, yyyy", Locale.ENGLISH)
			.withZone(ZoneOffset.UTC);

	private final ContactDiaryRepository repository;
	private final StaffUserRepository staffUserRepository;

	public ContactDiaryService(ContactDiaryRepository repository, StaffUserRepository staffUserRepository) {
		this.repository = repository;
		this.staffUserRepository = staffUserRepository;
	}

	@Transactional(readOnly = true)
	public List<ContactDiaryResponse> list() {
		var session = AuthContext.get();
		var entries = repository.findAllByOrderByCreatedAtDesc();
		if (session != null && session.role() != null && session.role().equalsIgnoreCase("EMPLOYEE")) {
			var staffUser = staffUserRepository.findByEmailIgnoreCase(session.username()).orElse(null);
			if (staffUser != null && staffUser.getName() != null && !staffUser.getName().isBlank()) {
				var name = staffUser.getName().trim().toLowerCase();
				return entries.stream()
						.filter(e -> e.getContactPerson() != null && e.getContactPerson().trim().toLowerCase().equals(name))
						.map(ContactDiaryService::toResponse)
						.collect(Collectors.toList());
			} else {
				return List.of();
			}
		}
		return entries.stream().map(ContactDiaryService::toResponse)
				.collect(Collectors.toList());
	}

	@Transactional
	public ContactDiaryResponse create(ContactDiaryRequest request) {
		var entry = new ContactDiaryEntry();
		apply(entry, request);
		var session = AuthContext.get();
		if (session != null && session.role() != null && session.role().equalsIgnoreCase("EMPLOYEE")) {
			var staffUser = staffUserRepository.findByEmailIgnoreCase(session.username()).orElse(null);
			if (staffUser != null && staffUser.getName() != null && !staffUser.getName().isBlank()) {
				entry.setContactPerson(staffUser.getName());
			}
		}
		if (entry.getStatus() == null || entry.getStatus().isBlank()) {
			entry.setStatus("active");
		}
		entry.setCreatedAt(Instant.now());
		return toResponse(repository.save(entry));
	}

	@Transactional
	public ContactDiaryResponse update(long id, ContactDiaryRequest request) {
		var entry = repository.findById(id)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Contact entry not found"));

		var session = AuthContext.get();
		if (session != null && session.role() != null && session.role().equalsIgnoreCase("EMPLOYEE")) {
			var staffUser = staffUserRepository.findByEmailIgnoreCase(session.username()).orElse(null);
			if (staffUser == null || staffUser.getName() == null || staffUser.getName().isBlank() ||
					entry.getContactPerson() == null || !entry.getContactPerson().trim().equalsIgnoreCase(staffUser.getName().trim())) {
				throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Contact entry not found");
			}
			apply(entry, request);
			entry.setContactPerson(staffUser.getName());
		} else {
			apply(entry, request);
		}
		return toResponse(repository.save(entry));
	}

	@Transactional
	public void delete(long id) {
		var entry = repository.findById(id)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Contact entry not found"));

		var session = AuthContext.get();
		if (session != null && session.role() != null && session.role().equalsIgnoreCase("EMPLOYEE")) {
			var staffUser = staffUserRepository.findByEmailIgnoreCase(session.username()).orElse(null);
			if (staffUser == null || staffUser.getName() == null || staffUser.getName().isBlank() ||
					entry.getContactPerson() == null || !entry.getContactPerson().trim().equalsIgnoreCase(staffUser.getName().trim())) {
				throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Contact entry not found");
			}
		}

		repository.delete(entry);
	}

	private void apply(ContactDiaryEntry entry, ContactDiaryRequest request) {
		var visitor = normalize(request.visitor());
		if (visitor.isBlank()) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Visitor name is required");
		}
		entry.setVisitor(visitor);
		entry.setContactPerson(normalize(request.contactPerson()));
		entry.setPhone(normalize(request.phone()));
		entry.setPurpose(normalize(request.purpose()));
		if (request.status() != null && !request.status().isBlank()) {
			entry.setStatus(normalize(request.status()));
		}
	}

	private static ContactDiaryResponse toResponse(ContactDiaryEntry e) {
		return new ContactDiaryResponse(e.getId(), e.getVisitor(), e.getContactPerson(), e.getPhone(), e.getPurpose(),
				DATE_FORMAT.format(e.getCreatedAt()), e.getStatus());
	}

	private static String normalize(String value) {
		return value == null ? "" : value.trim();
	}
}
