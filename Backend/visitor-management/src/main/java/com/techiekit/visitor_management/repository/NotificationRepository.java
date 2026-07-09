package com.techiekit.visitor_management.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.techiekit.visitor_management.entity.Notification;

public interface NotificationRepository extends JpaRepository<Notification, Long> {
	List<Notification> findTop50ByRecipientUsernameIgnoreCaseOrderByCreatedAtDesc(String recipientUsername);

	long countByRecipientUsernameIgnoreCaseAndReadFalse(String recipientUsername);

	@Modifying(clearAutomatically = true)
	@Query("update Notification n set n.read = true where lower(n.recipientUsername) = lower(:user) and n.read = false")
	int markAllRead(@Param("user") String user);

	@Modifying(clearAutomatically = true)
	@Query("update Notification n set n.read = true where n.id = :id and lower(n.recipientUsername) = lower(:user) and n.read = false")
	int markAsRead(@Param("id") long id, @Param("user") String user);
}
