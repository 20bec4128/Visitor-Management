package com.techiekit.visitor_management.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.techiekit.visitor_management.entity.AppUser;

public interface UserRepository extends JpaRepository<AppUser, Long> {
	Optional<AppUser> findByUsername(String username);

	List<AppUser> findByRoleIgnoreCase(String role);

	boolean existsByUsername(String username);

	Optional<AppUser> findByUsernameIgnoreCase(String username);

	boolean existsByUsernameIgnoreCase(String username);
}
