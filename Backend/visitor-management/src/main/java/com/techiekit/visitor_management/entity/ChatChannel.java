package com.techiekit.visitor_management.entity;

import java.time.Instant;
import java.util.HashSet;
import java.util.Set;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Table;

/**
 * An admin-created chat channel. Only its {@code members} (usernames, lower-cased) — plus admins —
 * can see and post in it. Referenced elsewhere as {@code custom:<id>}.
 */
@Entity
@Table(name = "chat_channels")
public class ChatChannel {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(nullable = false)
	private String name;

	@Column(name = "created_by")
	private String createdBy;

	@ElementCollection(fetch = FetchType.LAZY)
	@CollectionTable(name = "chat_channel_members", joinColumns = @JoinColumn(name = "channel_id"))
	@Column(name = "username")
	private Set<String> members = new HashSet<>();

	@Column(name = "created_at", nullable = false)
	private Instant createdAt = Instant.now();

	public ChatChannel() {
	}

	public Set<String> getMembers() {
		return members;
	}

	public void setMembers(Set<String> members) {
		this.members = members;
	}

	public Long getId() {
		return id;
	}

	public String getName() {
		return name;
	}

	public void setName(String name) {
		this.name = name;
	}

	public String getCreatedBy() {
		return createdBy;
	}

	public void setCreatedBy(String createdBy) {
		this.createdBy = createdBy;
	}

	public Instant getCreatedAt() {
		return createdAt;
	}

	public void setCreatedAt(Instant createdAt) {
		this.createdAt = createdAt;
	}
}
