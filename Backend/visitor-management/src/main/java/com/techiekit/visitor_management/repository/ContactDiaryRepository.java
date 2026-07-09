package com.techiekit.visitor_management.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.techiekit.visitor_management.entity.ContactDiaryEntry;

public interface ContactDiaryRepository extends JpaRepository<ContactDiaryEntry, Long> {
	List<ContactDiaryEntry> findAllByOrderByCreatedAtDesc();
}
