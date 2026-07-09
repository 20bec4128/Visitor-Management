package com.techiekit.visitor_management.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.techiekit.visitor_management.entity.ChatChannel;

public interface ChatChannelRepository extends JpaRepository<ChatChannel, Long> {
	List<ChatChannel> findAllByOrderByNameAsc();

	boolean existsByNameIgnoreCase(String name);

	/** Channels the given user (lower-cased compare) is a member of. */
	@Query("select c from ChatChannel c join c.members m where lower(m) = lower(:user) order by c.name asc")
	List<ChatChannel> findByMember(@Param("user") String user);

	@Query("select case when count(c) > 0 then true else false end from ChatChannel c "
			+ "join c.members m where c.id = :id and lower(m) = lower(:user)")
	boolean isMember(@Param("id") long id, @Param("user") String user);
}
