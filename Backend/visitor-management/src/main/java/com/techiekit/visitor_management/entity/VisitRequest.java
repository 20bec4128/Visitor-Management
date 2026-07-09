package com.techiekit.visitor_management.entity;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "visit_requests")
public class VisitRequest {

	public enum Status {
		PENDING,
		APPROVED,
		REJECTED,
		CHECKED_IN,
		CHECKED_OUT
	}

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "visitor_id", nullable = false)
	private Visitor visitor;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "host_user_id", nullable = false)
	private StaffUser hostUser;

	@Column(name = "visit_at", nullable = false)
	private Instant visitAt;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false)
	private Status status;

	@Column
	private String purpose;

	@Column(name = "visit_category")
	private String visitCategory;

	@Column(name = "payment_id")
	private String paymentId;

	@Column(name = "created_at", nullable = false)
	private Instant createdAt;

	@Column(name = "entry_time")
	private Instant entryTime;

	@Column(name = "exit_time")
	private Instant exitTime;

	@Column(name = "rejection_reason")
	private String rejectionReason;

	@Column(name = "factory_purpose")
	private String factoryPurpose;

	@Column(name = "factory_safety_gear_required")
	private Boolean factorySafetyGearRequired;

	@Column(name = "factory_area_visiting")
	private String factoryAreaVisiting;

	@Column(name = "factory_supervisor_name")
	private String factorySupervisorName;

	@Column(name = "factory_material_carrying")
	private Boolean factoryMaterialCarrying;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "pre_register_request_id")
	private PreRegisterRequest preRegisterRequest;

	public VisitRequest() {
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

	public StaffUser getHostUser() {
		return hostUser;
	}

	public void setHostUser(StaffUser hostUser) {
		this.hostUser = hostUser;
	}

	public Instant getVisitAt() {
		return visitAt;
	}

	public void setVisitAt(Instant visitAt) {
		this.visitAt = visitAt;
	}

	public Status getStatus() {
		return status;
	}

	public void setStatus(Status status) {
		this.status = status;
	}

	public String getPurpose() {
		return purpose;
	}

	public void setPurpose(String purpose) {
		this.purpose = purpose;
	}

	public String getVisitCategory() {
		return visitCategory;
	}

	public void setVisitCategory(String visitCategory) {
		this.visitCategory = visitCategory;
	}

	public String getPaymentId() {
		return paymentId;
	}

	public void setPaymentId(String paymentId) {
		this.paymentId = paymentId;
	}

	public Instant getCreatedAt() {
		return createdAt;
	}

	public void setCreatedAt(Instant createdAt) {
		this.createdAt = createdAt;
	}

	public Instant getEntryTime() {
		return entryTime;
	}

	public void setEntryTime(Instant entryTime) {
		this.entryTime = entryTime;
	}

	public Instant getExitTime() {
		return exitTime;
	}

	public void setExitTime(Instant exitTime) {
		this.exitTime = exitTime;
	}

	public String getRejectionReason() {
		return rejectionReason;
	}

	public void setRejectionReason(String rejectionReason) {
		this.rejectionReason = rejectionReason;
	}

	public String getFactoryPurpose() {
		return factoryPurpose;
	}

	public void setFactoryPurpose(String factoryPurpose) {
		this.factoryPurpose = factoryPurpose;
	}

	public Boolean getFactorySafetyGearRequired() {
		return factorySafetyGearRequired;
	}

	public void setFactorySafetyGearRequired(Boolean factorySafetyGearRequired) {
		this.factorySafetyGearRequired = factorySafetyGearRequired;
	}

	public String getFactoryAreaVisiting() {
		return factoryAreaVisiting;
	}

	public void setFactoryAreaVisiting(String factoryAreaVisiting) {
		this.factoryAreaVisiting = factoryAreaVisiting;
	}

	public String getFactorySupervisorName() {
		return factorySupervisorName;
	}

	public void setFactorySupervisorName(String factorySupervisorName) {
		this.factorySupervisorName = factorySupervisorName;
	}

	public Boolean getFactoryMaterialCarrying() {
		return factoryMaterialCarrying;
	}

	public void setFactoryMaterialCarrying(Boolean factoryMaterialCarrying) {
		this.factoryMaterialCarrying = factoryMaterialCarrying;
	}

	public PreRegisterRequest getPreRegisterRequest() {
		return preRegisterRequest;
	}

	public void setPreRegisterRequest(PreRegisterRequest preRegisterRequest) {
		this.preRegisterRequest = preRegisterRequest;
	}
}
