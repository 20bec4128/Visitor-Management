package com.techiekit.visitor_management.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.techiekit.visitor_management.entity.SosAlert;

public interface SosAlertRepository extends JpaRepository<SosAlert, Long> {
	List<SosAlert> findAllByOrderByCreatedAtDesc();

	List<SosAlert> findByStatusOrderByCreatedAtDesc(String status);
}
