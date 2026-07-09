package com.techiekit.visitor_management.entity;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;

/** A per-user in-app notification (e.g. "an employee approved a visit"). */
@Entity
@Table(name = "notifications", indexes = {
		@Index(name = "idx_notifications_recipient", columnList = "recipient_username") })
public class Notification {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "recipient_username", nullable = false)
	private String recipientUsername;

	@Column
	private String type;

	@Column(nullable = false)
	private String title;

	@Column(length = 1000)
	private String message;

	@Column
	private String link;

	@Column(name = "is_read", nullable = false)
	private boolean read = false;

	@Column(name = "created_at", nullable = false)
	private Instant createdAt = Instant.now();

	public Notification() {
	}

	public Long getId() {
		return id;
	}

	public String getRecipientUsername() {
		return recipientUsername;
	}

	public void setRecipientUsername(String recipientUsername) {
		this.recipientUsername = recipientUsername;
	}

	public String getType() {
		return type;
	}

	public void setType(String type) {
		this.type = type;
	}

	public String getTitle() {
		return title;
	}

	public void setTitle(String title) {
		this.title = title;
	}

	public String getMessage() {
		return message;
	}

	public void setMessage(String message) {
		this.message = message;
	}

	public String getLink() {
		return link;
	}

	public void setLink(String link) {
		this.link = link;
	}

	public boolean isRead() {
		return read;
	}

	public void setRead(boolean read) {
		this.read = read;
	}

	public Instant getCreatedAt() {
		return createdAt;
	}

	public void setCreatedAt(Instant createdAt) {
		this.createdAt = createdAt;
	}
}
