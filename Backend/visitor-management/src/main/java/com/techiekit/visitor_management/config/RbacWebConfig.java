package com.techiekit.visitor_management.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import com.techiekit.visitor_management.rbac.RbacInterceptor;

@Configuration
public class RbacWebConfig implements WebMvcConfigurer {

	private final RbacInterceptor rbacInterceptor;

	public RbacWebConfig(RbacInterceptor rbacInterceptor) {
		this.rbacInterceptor = rbacInterceptor;
	}

	@Override
	public void addInterceptors(InterceptorRegistry registry) {
		registry.addInterceptor(rbacInterceptor)
				.addPathPatterns("/api/**");
	}
}
