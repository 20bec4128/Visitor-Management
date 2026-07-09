package com.techiekit.visitor_management.entity;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Lob;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "visitor_faces")
public class VisitorFace {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@OneToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "visitor_id", nullable = false, unique = true)
	private Visitor visitor;

	@Lob
	@Column(name = "embedding_json", nullable = false, columnDefinition = "TEXT")
	private String embeddingJson;

	@Lob
	@Column(name = "face_image_base64", columnDefinition = "TEXT")
	private String faceImageBase64;

	@Column(name = "created_at", nullable = false)
	private Instant createdAt;

	public VisitorFace() {
	}

	public Long getId() {
		return id;
	}

	public Visitor getVisitor() {
		return visitor;
	}

	public void setVisitor(Visitor visitor) {
		this.visitor = visitor;
	}

	public String getEmbeddingJson() {
		return embeddingJson;
	}

	public void setEmbeddingJson(String embeddingJson) {
		this.embeddingJson = embeddingJson;
	}

	public String getFaceImageBase64() {
		return faceImageBase64;
	}

	public void setFaceImageBase64(String faceImageBase64) {
		this.faceImageBase64 = faceImageBase64;
	}

	public Instant getCreatedAt() {
		return createdAt;
	}

	public void setCreatedAt(Instant createdAt) {
		this.createdAt = createdAt;
	}
}
