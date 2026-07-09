package com.techiekit.visitor_management.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.techiekit.visitor_management.entity.Visitor;

public interface VisitorRepository extends JpaRepository<Visitor, Long> {
}

