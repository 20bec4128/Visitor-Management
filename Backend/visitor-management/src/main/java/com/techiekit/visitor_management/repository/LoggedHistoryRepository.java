package com.techiekit.visitor_management.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.techiekit.visitor_management.entity.LoggedHistory;

public interface LoggedHistoryRepository extends JpaRepository<LoggedHistory, Long> {
	List<LoggedHistory> findAllByOrderByOccurredAtDesc();
}

