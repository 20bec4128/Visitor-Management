package com.techiekit.visitor_management.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.Query;

import com.techiekit.visitor_management.entity.Role;

public interface RoleRepository extends JpaRepository<Role, Long> {
	boolean existsByTitleIgnoreCase(String title);

	Optional<Role> findByTitleIgnoreCase(String title);

	@EntityGraph(attributePaths = "permissions")
	@Query("select r from Role r where upper(r.title) = upper(?1)")
	Optional<Role> findByTitleIgnoreCaseWithPermissions(String title);

	@Query("select coalesce(max(r.level), 0) from Role r")
	int findMaxLevel();

	@Query("select r.id, count(su.id) from Role r left join r.staffUsers su group by r.id")
	List<Object[]> countUsersPerRole();

	@Query("select (count(su.id) > 0) from Role r join r.staffUsers su where r.id = ?1")
	boolean hasAnyUsers(long roleId);
}
