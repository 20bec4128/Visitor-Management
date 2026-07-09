package com.techiekit.visitor_management.entity;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** An SOS emergency alert raised by a user. Broadcast to everyone and kept as a resolvable log. */
@Entity
@Table(name = "sos_alerts")
public class SosAlert {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "triggered_by_username", nullable = false)
	private String triggeredByUsername;

	@Column(name = "triggered_by_name")
	private String triggeredByName;

	@Column
	private String role;

	@Column(length = 2000)
	private String message;

	@Column
	private String location;

	@Column(nullable = false)
	private String status = "ACTIVE";

	@Column(name = "created_at", nullable = false)
	private Instant createdAt = Instant.now();

	@Column(name = "resolved_at")
	private Instant resolvedAt;

	@Column(name = "resolved_by_username")
	private String resolvedByUsername;

	public SosAlert() {
	}

	public Long getId() {
		return id;
	}

	public String getTriggeredByUsername() {
		return triggeredByUsername;
	}

	public void setTriggeredByUsername(String triggeredByUsername) {
		this.triggeredByUsername = triggeredByUsername;
	}

	public String getTriggeredByName() {
		return triggeredByName;
	}

	public void setTriggeredByName(String triggeredByName) {
		this.triggeredByName = triggeredByName;
	}

	public String getRole() {
		return role;
	}

	public void setRole(String role) {
		this.role = role;
	}

	public String getMessage() {
		return message;
	}

	public void setMessage(String message) {
		this.message = message;
	}

	public String getLocation() {
		return location;
	}

	public void setLocation(String location) {
		this.location = location;
	}

	public String getStatus() {
		return status;
	}

	public void setStatus(String status) {
		this.status = status;
	}

	public Instant getCreatedAt() {
		return createdAt;
	}

	public void setCreatedAt(Instant createdAt) {
		this.createdAt = createdAt;
	}

	public Instant getResolvedAt() {
		return resolvedAt;
	}

	public void setResolvedAt(Instant resolvedAt) {
		this.resolvedAt = resolvedAt;
	}

	public String getResolvedByUsername() {
		return resolvedByUsername;
	}

	public void setResolvedByUsername(String resolvedByUsername) {
		this.resolvedByUsername = resolvedByUsername;
	}
}
