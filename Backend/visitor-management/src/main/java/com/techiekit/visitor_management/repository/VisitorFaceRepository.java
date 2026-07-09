package com.techiekit.visitor_management.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.techiekit.visitor_management.entity.VisitorFace;

public interface VisitorFaceRepository extends JpaRepository<VisitorFace, Long> {
	Optional<VisitorFace> findByVisitorId(Long visitorId);
}

