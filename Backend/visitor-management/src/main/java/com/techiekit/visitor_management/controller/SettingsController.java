package com.techiekit.visitor_management.controller;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.techiekit.visitor_management.entity.AppSetting;
import com.techiekit.visitor_management.rbac.AnonymousAccess;
import com.techiekit.visitor_management.rbac.PermissionCatalog;
import com.techiekit.visitor_management.rbac.RequiresPermissions;
import com.techiekit.visitor_management.repository.AppSettingRepository;
import com.techiekit.visitor_management.service.FileStorageService;
import com.techiekit.visitor_management.service.MailService;

@RestController
@RequestMapping("/api/settings")
@RequiresPermissions({ PermissionCatalog.SETTINGS_MANAGE })
public class SettingsController {

	private static final Set<String> ALLOWED_SECTIONS = Set.of("general", "email", "payment");

	private final AppSettingRepository repository;
	private final ObjectMapper objectMapper;
	private final MailService mailService;
	private final FileStorageService fileStorageService;

	public SettingsController(AppSettingRepository repository, ObjectMapper objectMapper, MailService mailService,
			FileStorageService fileStorageService) {
		this.repository = repository;
		this.objectMapper = objectMapper;
		this.mailService = mailService;
		this.fileStorageService = fileStorageService;
	}

	@GetMapping("/{section}")
	public Map<String, Object> get(@PathVariable String section) {
		var key = validate(section);
		return repository.findById(key).map(this::readValue).orElseGet(Collections::emptyMap);
	}

	/**
	 * Public branding (company name + logo) read by every user for the app header.
	 * Anonymous so non-admins (who lack settings.manage) can still load it.
	 */
	@AnonymousAccess
	@GetMapping("/branding")
	public Map<String, Object> branding() {
		var general = repository.findById("general").map(this::readValue).orElseGet(Collections::emptyMap);
		var out = new LinkedHashMap<String, Object>();
		out.put("companyName", general.getOrDefault("company_name", ""));
		out.put("companyLogo", general.getOrDefault("company_logo", ""));
		return out;
	}

	@PutMapping("/{section}")
	public Map<String, Object> update(@PathVariable String section, @RequestBody Map<String, Object> body) {
		var key = validate(section);
		var setting = repository.findById(key).orElseGet(() -> new AppSetting(key, "{}"));
		setting.setValueJson(writeValue(body == null ? Collections.emptyMap() : body));
		repository.save(setting);
		return readValue(setting);
	}

	@PostMapping("/general/logo")
	public Map<String, Object> uploadGeneralLogo(@RequestParam("file") MultipartFile file) {
		var url = fileStorageService.storeImage(file, "settings");
		var setting = repository.findById("general").orElseGet(() -> new AppSetting("general", "{}"));
		var map = new LinkedHashMap<String, Object>(readValue(setting));
		map.put("company_logo", url);
		setting.setValueJson(writeValue(map));
		repository.save(setting);
		return readValue(setting);
	}

	@PostMapping("/email/test")
	public Map<String, Object> sendTestEmail(@RequestBody(required = false) Map<String, Object> body) {
		var to = body == null ? "" : String.valueOf(body.getOrDefault("to", "")).trim();
		if (to.isBlank() || "null".equals(to)) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Recipient email is required");
		}
		mailService.sendText(to, "VMS test email",
				"This is a test email from your Visitor Management System.\n\n"
						+ "If you received this message, your SMTP settings are configured correctly.");
		return Map.of("sent", true, "to", to);
	}

	private String validate(String section) {
		var key = section == null ? "" : section.trim().toLowerCase();
		if (!ALLOWED_SECTIONS.contains(key)) {
			throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Unknown settings section");
		}
		return key;
	}

	private Map<String, Object> readValue(AppSetting setting) {
		try {
			if (setting.getValueJson() == null || setting.getValueJson().isBlank()) {
				return Collections.emptyMap();
			}
			return objectMapper.readValue(setting.getValueJson(), new TypeReference<Map<String, Object>>() {
			});
		} catch (Exception e) {
			return Collections.emptyMap();
		}
	}

	private String writeValue(Map<String, Object> body) {
		try {
			return objectMapper.writeValueAsString(body);
		} catch (Exception e) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid settings payload");
		}
	}
}
