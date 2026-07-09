package com.techiekit.visitor_management.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.techiekit.visitor_management.entity.OrganizationType;

public interface OrganizationTypeRepository extends JpaRepository<OrganizationType, Long> {
	List<OrganizationType> findAllByOrderByCreatedAtAsc();

	Optional<OrganizationType> findByNameIgnoreCase(String name);

	boolean existsByNameIgnoreCase(String name);
}
