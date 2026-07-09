package com.techiekit.visitor_management.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.techiekit.visitor_management.entity.VisitCategory;

public interface VisitCategoryRepository extends JpaRepository<VisitCategory, Long> {
	List<VisitCategory> findAllByOrderByCreatedAtDesc();
}
