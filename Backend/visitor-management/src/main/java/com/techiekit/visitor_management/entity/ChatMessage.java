package com.techiekit.visitor_management.entity;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;

/**
 * A single chat message. {@code channel} encodes the conversation:
 * <ul>
 * <li>{@code all} — the all-staff channel</li>
 * <li>{@code role:<ROLE>} — a role/group channel</li>
 * <li>{@code dm:<userA>|<userB>} — a 1:1 direct message (usernames sorted, canonical)</li>
 * </ul>
 */
@Entity
@Table(name = "chat_messages", indexes = { @Index(name = "idx_chat_messages_channel", columnList = "channel") })
public class ChatMessage {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(nullable = false)
	private String channel;

	@Column(name = "sender_username", nullable = false)
	private String senderUsername;

	@Column(name = "sender_name")
	private String senderName;

	@Column(nullable = false, length = 4000)
	private String body;

	@Column(name = "message_type")
	private String messageType; // null/"TEXT" for normal messages, "CALL" for call logs

	@Column(name = "attachment_url")
	private String attachmentUrl;

	@Column(name = "attachment_name")
	private String attachmentName;

	@Column(name = "attachment_type")
	private String attachmentType;

	@Column(name = "attachment_size")
	private Long attachmentSize;

	@Column(name = "created_at", nullable = false)
	private Instant createdAt = Instant.now();

	public ChatMessage() {
	}

	public Long getId() {
		return id;
	}

	public String getChannel() {
		return channel;
	}

	public void setChannel(String channel) {
		this.channel = channel;
	}

	public String getSenderUsername() {
		return senderUsername;
	}

	public void setSenderUsername(String senderUsername) {
		this.senderUsername = senderUsername;
	}

	public String getSenderName() {
		return senderName;
	}

	public void setSenderName(String senderName) {
		this.senderName = senderName;
	}

	public String getBody() {
		return body;
	}

	public void setBody(String body) {
		this.body = body;
	}

	public String getMessageType() {
		return messageType;
	}

	public void setMessageType(String messageType) {
		this.messageType = messageType;
	}

	public String getAttachmentUrl() {
		return attachmentUrl;
	}

	public void setAttachmentUrl(String attachmentUrl) {
		this.attachmentUrl = attachmentUrl;
	}

	public String getAttachmentName() {
		return attachmentName;
	}

	public void setAttachmentName(String attachmentName) {
		this.attachmentName = attachmentName;
	}

	public String getAttachmentType() {
		return attachmentType;
	}

	public void setAttachmentType(String attachmentType) {
		this.attachmentType = attachmentType;
	}

	public Long getAttachmentSize() {
		return attachmentSize;
	}

	public void setAttachmentSize(Long attachmentSize) {
		this.attachmentSize = attachmentSize;
	}

	public Instant getCreatedAt() {
		return createdAt;
	}

	public void setCreatedAt(Instant createdAt) {
		this.createdAt = createdAt;
	}
}
