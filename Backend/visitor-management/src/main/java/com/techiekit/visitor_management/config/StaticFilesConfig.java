package com.techiekit.visitor_management.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Paths;

@Configuration
public class StaticFilesConfig implements WebMvcConfigurer {

	private final String uploadsDir;

	public StaticFilesConfig(@Value("${app.uploads.dir:uploads}") String uploadsDir) {
		this.uploadsDir = uploadsDir;
	}

	@Override
	public void addResourceHandlers(ResourceHandlerRegistry registry) {
		var location = Paths.get(uploadsDir).toAbsolutePath().normalize().toUri().toString();
		registry.addResourceHandler("/uploads/**")
				.addResourceLocations(location);
	}
}
