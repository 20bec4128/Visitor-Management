package com.techiekit.visitor_management.repository;

import java.util.List;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import com.techiekit.visitor_management.entity.VisitRequest;
import com.techiekit.visitor_management.entity.VisitRequest.Status;

public interface VisitRequestRepository extends JpaRepository<VisitRequest, Long> {
	List<VisitRequest> findTop10ByVisitorIdOrderByVisitAtDesc(Long visitorId);

	@EntityGraph(attributePaths = {"visitor", "hostUser"})
	List<VisitRequest> findAllByOrderByCreatedAtDesc();

	@EntityGraph(attributePaths = {"visitor", "hostUser"})
	List<VisitRequest> findByStatusOrderByCreatedAtDesc(Status status);

	boolean existsByVisitorIdAndStatus(Long visitorId, Status status);

	boolean existsByVisitorEmailIgnoreCaseAndStatus(String email, Status status);
}

