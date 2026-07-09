package com.techiekit.visitor_management.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import com.techiekit.visitor_management.entity.StaffUser;

public interface StaffUserRepository extends JpaRepository<StaffUser, Long> {
	boolean existsByEmailIgnoreCase(String email);

	@EntityGraph(attributePaths = { "roles" })
	Optional<StaffUser> findByEmailIgnoreCase(String email);

	@Override
	@EntityGraph(attributePaths = { "roles" })
	Optional<StaffUser> findById(Long id);

	@EntityGraph(attributePaths = { "roles" })
	List<StaffUser> findAll();
}
