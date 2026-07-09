package com.techiekit.visitor_management.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.techiekit.visitor_management.entity.EmailTemplate;

public interface EmailTemplateRepository extends JpaRepository<EmailTemplate, Long> {
	List<EmailTemplate> findAllByOrderByCreatedAtDesc();
}
