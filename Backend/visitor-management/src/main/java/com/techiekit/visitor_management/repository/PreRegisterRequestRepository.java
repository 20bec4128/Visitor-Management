package com.techiekit.visitor_management.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import com.techiekit.visitor_management.entity.PreRegisterRequest;

public interface PreRegisterRequestRepository extends JpaRepository<PreRegisterRequest, Long> {
	@EntityGraph(attributePaths = { "hostUser" })
	List<PreRegisterRequest> findAllByOrderByCreatedAtDesc();

	@EntityGraph(attributePaths = { "hostUser" })
	Optional<PreRegisterRequest> findWithHostUserById(Long id);

	@EntityGraph(attributePaths = { "hostUser" })
	Optional<PreRegisterRequest> findByApprovalToken(String approvalToken);
}
