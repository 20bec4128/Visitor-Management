package com.techiekit.visitor_management.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.techiekit.visitor_management.entity.ChatMessage;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {
	List<ChatMessage> findTop50ByChannelOrderByCreatedAtDesc(String channel);

	ChatMessage findTop1ByChannelOrderByCreatedAtDesc(String channel);

	/** All direct-message rows involving a user (the channel key contains both usernames, lower-cased),
	 *  newest first — used to build the conversation list previews. */
	@Query("select m from ChatMessage m where m.channel like 'dm:%' "
			+ "and lower(m.channel) like lower(concat('%', :user, '%')) order by m.createdAt desc")
	List<ChatMessage> findDmMessagesForUser(@Param("user") String user);
}
