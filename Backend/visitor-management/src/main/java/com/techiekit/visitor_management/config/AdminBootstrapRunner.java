package com.techiekit.visitor_management.config;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

import com.techiekit.visitor_management.service.AuthService;

@Component
public class AdminBootstrapRunner implements ApplicationRunner {

	private final AuthService authService;

	public AdminBootstrapRunner(AuthService authService) {
		this.authService = authService;
	}

	@Override
	public void run(ApplicationArguments args) {
		authService.bootstrapAdmin();
	}
}

