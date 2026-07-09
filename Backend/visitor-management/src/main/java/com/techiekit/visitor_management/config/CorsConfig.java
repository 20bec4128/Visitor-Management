package com.techiekit.visitor_management.config;

import java.util.ArrayList;
import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class CorsConfig implements WebMvcConfigurer {

	@Value("${app.frontend.url:http://localhost:5173}")
	private String frontendUrl;

	@Value("${app.frontend.urls:}")
	private String frontendUrls;

	private static List<String> splitCsv(String csv) {
		var out = new ArrayList<String>();
		if (csv == null) return out;
		for (var part : csv.split(",")) {
			if (part == null) continue;
			var trimmed = part.trim();
			if (!trimmed.isEmpty()) out.add(trimmed);
		}
		return out;
	}

	@Override
	public void addCorsMappings(CorsRegistry registry) {
		var allowed = new ArrayList<String>();
		allowed.addAll(splitCsv(frontendUrl));
		allowed.addAll(splitCsv(frontendUrls));
		var allowedOrigins = allowed.toArray(String[]::new);

		registry.addMapping("/api/**")
				// Use explicit origins for production (exact match of scheme + host + optional port).
				.allowedOrigins(allowedOrigins.length == 0 ? new String[] { "http://localhost:5173" } : allowedOrigins)
				// Keep dev-friendly patterns for local testing across ports.
				.allowedOriginPatterns("http://localhost:*", "http://127.0.0.1:*")
				.allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
				.allowedHeaders("*")
				.maxAge(3600);

		// Allow the frontend to fetch uploaded media (e.g. to force-download chat attachments
		// cross-origin in dev). Reads only.
		registry.addMapping("/uploads/**")
				.allowedOrigins(allowedOrigins.length == 0 ? new String[] { "http://localhost:5173" } : allowedOrigins)
				.allowedOriginPatterns("http://localhost:*", "http://127.0.0.1:*")
				.allowedMethods("GET", "OPTIONS")
				.allowedHeaders("*")
				.maxAge(3600);
	}
}
