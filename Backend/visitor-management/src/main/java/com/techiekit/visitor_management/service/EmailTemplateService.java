package com.techiekit.visitor_management.service;

import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.techiekit.visitor_management.dto.EmailTemplateRequest;
import com.techiekit.visitor_management.dto.EmailTemplateResponse;
import com.techiekit.visitor_management.entity.EmailTemplate;
import com.techiekit.visitor_management.repository.AppSettingRepository;
import com.techiekit.visitor_management.repository.EmailTemplateRepository;

@Service
public class EmailTemplateService {

	private static final Logger log = LoggerFactory.getLogger(EmailTemplateService.class);

	private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("MMM dd, yyyy", Locale.ENGLISH)
			.withZone(ZoneOffset.UTC);

	private final EmailTemplateRepository repository;
	private final AppSettingRepository appSettingRepository;
	private final ObjectMapper objectMapper;
	private final MailService mailService;
	private final String appLink;

	public EmailTemplateService(EmailTemplateRepository repository, AppSettingRepository appSettingRepository,
			ObjectMapper objectMapper, MailService mailService,
			@Value("${app.frontend.url:}") String appLink) {
		this.repository = repository;
		this.appSettingRepository = appSettingRepository;
		this.objectMapper = objectMapper;
		this.mailService = mailService;
		this.appLink = appLink;
	}

	/** First enabled template for the given module (case-insensitive), if any. */
	@Transactional(readOnly = true)
	public Optional<EmailTemplate> findEnabled(String module) {
		var key = normalize(module);
		return repository.findAllByOrderByCreatedAtDesc().stream()
				.filter(EmailTemplate::isEnabled)
				.filter(t -> normalize(t.getModule()).equalsIgnoreCase(key))
				.findFirst();
	}

	/**
	 * Renders the enabled template for {module} (replacing (shortcode) tokens with the
	 * supplied vars plus the configured company shortcodes) and emails it to {to}.
	 * Best-effort: returns false (never throws) when there's no enabled template or the
	 * send fails, so callers don't break their main flow.
	 */
	public boolean sendForModule(String module, String to, Map<String, String> vars) {
		var template = findEnabled(module).orElse(null);
		if (template == null || to == null || to.isBlank()) {
			return false;
		}
		var merged = new LinkedHashMap<String, String>(companyShortcodes());
		if (vars != null) {
			vars.forEach((k, v) -> merged.put(k, v == null ? "" : v));
		}
		var subject = render(template.getSubject(), merged);
		var body = render(template.getMessage(), merged);
		try {
			mailService.sendText(to, subject, body);
			return true;
		} catch (Exception e) {
			log.warn("Templated email for module '{}' to {} failed: {}", module, to, e.getMessage());
			return false;
		}
	}

	/** Replaces every {@code (key)} occurrence in {text} with vars[key] (unknown tokens left as-is). */
	public static String render(String text, Map<String, String> vars) {
		if (text == null || text.isBlank() || vars == null) {
			return text == null ? "" : text;
		}
		var out = text;
		for (var entry : vars.entrySet()) {
			out = out.replace("(" + entry.getKey() + ")", entry.getValue() == null ? "" : entry.getValue());
		}
		return out;
	}

	private Map<String, String> companyShortcodes() {
		var general = readSection("general");
		var email = readSection("email");
		var payment = readSection("payment");
		var vars = new LinkedHashMap<String, String>();
		vars.put("company_name", str(general.get("company_name")));
		vars.put("company_email", firstNonBlank(str(email.get("fromEmail")), str(email.get("smtpUser"))));
		vars.put("company_phone_number", str(general.get("contact_number")));
		vars.put("company_address", str(general.get("address")));
		vars.put("company_currency", str(payment.get("currency")));
		vars.put("app_link", appLink == null ? "" : appLink);
		return vars;
	}

	private Map<String, Object> readSection(String key) {
		return appSettingRepository.findById(key).map(setting -> {
			try {
				var json = setting.getValueJson();
				if (json == null || json.isBlank()) {
					return Collections.<String, Object>emptyMap();
				}
				return objectMapper.readValue(json, new TypeReference<Map<String, Object>>() {
				});
			} catch (Exception e) {
				return Collections.<String, Object>emptyMap();
			}
		}).orElseGet(Collections::emptyMap);
	}

	private static String str(Object value) {
		return value == null ? "" : value.toString().trim();
	}

	private static String firstNonBlank(String a, String b) {
		return a == null || a.isBlank() ? (b == null ? "" : b) : a;
	}

	@Transactional(readOnly = true)
	public List<EmailTemplateResponse> list() {
		return repository.findAllByOrderByCreatedAtDesc().stream().map(EmailTemplateService::toResponse)
				.collect(Collectors.toList());
	}

	@Transactional
	public EmailTemplateResponse create(EmailTemplateRequest request) {
		var template = new EmailTemplate();
		apply(template, request);
		template.setCreatedAt(Instant.now());
		return toResponse(repository.save(template));
	}

	@Transactional
	public EmailTemplateResponse update(long id, EmailTemplateRequest request) {
		var template = repository.findById(id)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Email template not found"));
		apply(template, request);
		return toResponse(repository.save(template));
	}

	@Transactional
	public void delete(long id) {
		if (!repository.existsById(id)) {
			throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Email template not found");
		}
		repository.deleteById(id);
	}

	private void apply(EmailTemplate template, EmailTemplateRequest request) {
		var subject = normalize(request.subject());
		if (subject.isBlank()) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Subject is required");
		}
		template.setSubject(subject);
		var module = normalize(request.module());
		template.setModule(module.isBlank() ? "New User" : module);
		template.setMessage(request.message() == null ? "" : request.message().trim());
		template.setEnabled(request.enabled() == null ? true : request.enabled());
	}

	private static EmailTemplateResponse toResponse(EmailTemplate t) {
		return new EmailTemplateResponse(t.getId(), t.getModule(), t.getSubject(), t.getMessage(), t.isEnabled(),
				DATE_FORMAT.format(t.getCreatedAt()));
	}

	private static String normalize(String value) {
		return value == null ? "" : value.trim();
	}
}
