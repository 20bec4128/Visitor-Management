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

import com.techiekit.visitor_management.dto.NoticeRequest;
import com.techiekit.visitor_management.dto.NoticeResponse;
import com.techiekit.visitor_management.entity.Notice;
import com.techiekit.visitor_management.rbac.AuthContext;
import com.techiekit.visitor_management.repository.NoticeRepository;

@Service
public class NoticeService {

	private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("MMM dd, yyyy", Locale.ENGLISH)
			.withZone(ZoneOffset.UTC);

	private final NoticeRepository repository;

	public NoticeService(NoticeRepository repository) {
		this.repository = repository;
	}

	@Transactional(readOnly = true)
	public List<NoticeResponse> list() {
		return repository.findAllByOrderByCreatedAtDesc().stream().map(NoticeService::toResponse)
				.collect(Collectors.toList());
	}

	@Transactional
	public NoticeResponse create(NoticeRequest request) {
		var notice = new Notice();
		apply(notice, request);
		notice.setPostedBy(currentUsername());
		notice.setCreatedAt(Instant.now());
		return toResponse(repository.save(notice));
	}

	@Transactional
	public NoticeResponse update(long id, NoticeRequest request) {
		var notice = repository.findById(id)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Notice not found"));
		apply(notice, request);
		return toResponse(repository.save(notice));
	}

	@Transactional
	public void delete(long id) {
		if (!repository.existsById(id)) {
			throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Notice not found");
		}
		repository.deleteById(id);
	}

	private void apply(Notice notice, NoticeRequest request) {
		var title = normalize(request.title());
		notice.setTitle(title.isBlank() ? "Untitled Notice" : title);
		var category = normalize(request.category());
		notice.setCategory(category.isBlank() ? "General" : category);
		var status = normalize(request.status());
		if (!status.isBlank()) {
			notice.setStatus(status);
		}
		notice.setDescription(normalize(request.description()));
		notice.setAttachmentName(normalize(request.attachmentName()));
	}

	private static String currentUsername() {
		var session = AuthContext.get();
		var name = session == null ? null : session.username();
		return name == null || name.isBlank() ? "Admin" : name;
	}

	private static NoticeResponse toResponse(Notice n) {
		return new NoticeResponse(n.getId(), n.getTitle(), n.getCategory(), n.getPostedBy(),
				DATE_FORMAT.format(n.getCreatedAt()), n.getStatus(), n.getDescription(), n.getAttachmentName());
	}

	private static String normalize(String value) {
		return value == null ? "" : value.trim();
	}
}
