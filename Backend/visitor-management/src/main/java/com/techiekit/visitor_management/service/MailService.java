package com.techiekit.visitor_management.service;

import java.util.Collections;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.techiekit.visitor_management.repository.AppSettingRepository;

/**
 * Sends mail using the SMTP configuration persisted in the "email" settings
 * section (app_settings table) rather than static application.properties — so
 * an admin can configure mail from the UI without restarting the backend.
 */
@Service
public class MailService {

	private final AppSettingRepository repository;
	private final ObjectMapper objectMapper;

	public MailService(AppSettingRepository repository, ObjectMapper objectMapper) {
		this.repository = repository;
		this.objectMapper = objectMapper;
	}

	/** The saved Email/SMTP settings as a map (empty if never configured). */
	public Map<String, Object> emailSettings() {
		return repository.findById("email").map(setting -> {
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

	/** Send a plain-text email using the saved SMTP settings. */
	public void sendText(String to, String subject, String body) {
		if (to == null || to.isBlank()) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Recipient email is required");
		}
		var cfg = emailSettings();
		var host = str(cfg.get("smtpHost"));
		if (host.isBlank()) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
					"SMTP host is not configured. Save your Email settings first.");
		}

		var sender = buildSender(cfg);
		var fromEmail = str(cfg.get("fromEmail"));
		if (fromEmail.isBlank()) {
			fromEmail = str(cfg.get("smtpUser"));
		}

		var message = new SimpleMailMessage();
		if (!fromEmail.isBlank()) {
			message.setFrom(fromEmail);
		}
		message.setTo(to);
		message.setSubject(subject);
		message.setText(body);

		try {
			sender.send(message);
		} catch (Exception e) {
			throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Failed to send email: " + rootMessage(e));
		}
	}

	private JavaMailSenderImpl buildSender(Map<String, Object> cfg) {
		var sender = new JavaMailSenderImpl();
		sender.setHost(str(cfg.get("smtpHost")));
		sender.setPort(parseInt(str(cfg.get("smtpPort")), 587));
		sender.setUsername(str(cfg.get("smtpUser")));
		sender.setPassword(str(cfg.get("smtpPassword")));
		sender.setDefaultEncoding("UTF-8");

		var props = sender.getJavaMailProperties();
		props.put("mail.transport.protocol", "smtp");
		props.put("mail.smtp.auth", String.valueOf(!str(cfg.get("smtpUser")).isBlank()));

		var encryption = str(cfg.get("encryption")).toUpperCase();
		if ("TLS".equals(encryption)) {
			props.put("mail.smtp.starttls.enable", "true");
		} else if ("SSL".equals(encryption)) {
			props.put("mail.smtp.ssl.enable", "true");
		}
		// Trust the explicitly-configured SMTP host's certificate. Needed on networks
		// that do TLS inspection (a proxy presents its own cert), where the JVM
		// truststore can't validate the chain and STARTTLS otherwise fails.
		var host = str(cfg.get("smtpHost"));
		if (!host.isBlank()) {
			props.put("mail.smtp.ssl.trust", host);
		}
		props.put("mail.smtp.connectiontimeout", "10000");
		props.put("mail.smtp.timeout", "10000");
		props.put("mail.smtp.writetimeout", "10000");
		return sender;
	}

	private static String str(Object value) {
		return value == null ? "" : value.toString().trim();
	}

	private static int parseInt(String value, int fallback) {
		try {
			return Integer.parseInt(value.trim());
		} catch (Exception e) {
			return fallback;
		}
	}

	private static String rootMessage(Throwable error) {
		var current = error;
		while (current.getCause() != null && current.getCause() != current) {
			current = current.getCause();
		}
		return current.getMessage() == null ? current.getClass().getSimpleName() : current.getMessage();
	}
}
