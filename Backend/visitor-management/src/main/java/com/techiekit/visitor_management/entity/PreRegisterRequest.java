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
@Table(name = "pre_register_requests")
public class PreRegisterRequest {

	public enum Status {
		PENDING,
		APPROVED,
		REJECTED,
		COMPLETED,
		CHECKED_OUT
	}

	public enum OrganizationType {
		FACTORY,
		IT_COMPANY,
		HOSPITAL,
		SCHOOL
	}

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false)
	private Status status;

	@Column(name = "approval_token", unique = true)
	private String approvalToken;

	@Column(name = "created_at", nullable = false)
	private Instant createdAt;

	@Column(name = "visitor_name", nullable = false)
	private String visitorName;

	@Column(nullable = false)
	private String email;

	@Column(name = "phone_dial_code", nullable = false)
	private String phoneDialCode;

	@Column(name = "phone_number", nullable = false)
	private String phoneNumber;

	@Column(name = "company_name", nullable = false)
	private String companyName;

	@Column(name = "rejection_reason")
	private String rejectionReason;

	@Column(name = "id_proof_type", nullable = false)
	private String idProofType;

	@Column(name = "id_proof_number", nullable = false)
	private String idProofNumber;

	@Enumerated(EnumType.STRING)
	@Column(name = "organization_type", nullable = false)
	private OrganizationType organizationType;

	@Column(name = "visit_category")
	private String visitCategory;

	@Column(name = "payment_id")
	private String paymentId;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "host_user_id", nullable = false)
	private StaffUser hostUser;

	// Factory
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

	// IT
	@Column(name = "it_purpose")
	private String itPurpose;

	@Column(name = "it_employee_to_meet")
	private String itEmployeeToMeet;

	@Column(name = "it_meeting_room")
	private String itMeetingRoom;

	@Column(name = "it_laptop_carrying")
	private Boolean itLaptopCarrying;

	@Column(name = "it_nda_signed")
	private Boolean itNdaSigned;

	// Hospital
	@Column(name = "hospital_patient_name")
	private String hospitalPatientName;

	@Column(name = "hospital_ward_room")
	private String hospitalWardRoom;

	@Column(name = "hospital_relation")
	private String hospitalRelation;

	@Column(name = "hospital_visit_time_slot")
	private String hospitalVisitTimeSlot;

	// School
	@Column(name = "school_student_name")
	private String schoolStudentName;

	@Column(name = "school_class")
	private String schoolClass;

	@Column(name = "school_reason")
	private String schoolReason;

	public PreRegisterRequest() {
	}

	public Long getId() {
		return id;
	}

	public Status getStatus() {
		return status;
	}

	public void setStatus(Status status) {
		this.status = status;
	}

	public Instant getCreatedAt() {
		return createdAt;
	}

	public void setCreatedAt(Instant createdAt) {
		this.createdAt = createdAt;
	}

	public String getApprovalToken() {
		return approvalToken;
	}

	public void setApprovalToken(String approvalToken) {
		this.approvalToken = approvalToken;
	}

	public String getVisitorName() {
		return visitorName;
	}

	public void setVisitorName(String visitorName) {
		this.visitorName = visitorName;
	}

	public String getEmail() {
		return email;
	}

	public void setEmail(String email) {
		this.email = email;
	}

	public String getPhoneDialCode() {
		return phoneDialCode;
	}

	public void setPhoneDialCode(String phoneDialCode) {
		this.phoneDialCode = phoneDialCode;
	}

	public String getPhoneNumber() {
		return phoneNumber;
	}

	public void setPhoneNumber(String phoneNumber) {
		this.phoneNumber = phoneNumber;
	}

	public String getCompanyName() {
		return companyName;
	}

	public void setCompanyName(String companyName) {
		this.companyName = companyName;
	}

	public String getRejectionReason() {
		return rejectionReason;
	}

	public void setRejectionReason(String rejectionReason) {
		this.rejectionReason = rejectionReason;
	}

	public String getIdProofType() {
		return idProofType;
	}

	public void setIdProofType(String idProofType) {
		this.idProofType = idProofType;
	}

	public String getIdProofNumber() {
		return idProofNumber;
	}

	public void setIdProofNumber(String idProofNumber) {
		this.idProofNumber = idProofNumber;
	}

	public OrganizationType getOrganizationType() {
		return organizationType;
	}

	public void setOrganizationType(OrganizationType organizationType) {
		this.organizationType = organizationType;
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

	public StaffUser getHostUser() {
		return hostUser;
	}

	public void setHostUser(StaffUser hostUser) {
		this.hostUser = hostUser;
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

	public String getItPurpose() {
		return itPurpose;
	}

	public void setItPurpose(String itPurpose) {
		this.itPurpose = itPurpose;
	}

	public String getItEmployeeToMeet() {
		return itEmployeeToMeet;
	}

	public void setItEmployeeToMeet(String itEmployeeToMeet) {
		this.itEmployeeToMeet = itEmployeeToMeet;
	}

	public String getItMeetingRoom() {
		return itMeetingRoom;
	}

	public void setItMeetingRoom(String itMeetingRoom) {
		this.itMeetingRoom = itMeetingRoom;
	}

	public Boolean getItLaptopCarrying() {
		return itLaptopCarrying;
	}

	public void setItLaptopCarrying(Boolean itLaptopCarrying) {
		this.itLaptopCarrying = itLaptopCarrying;
	}

	public Boolean getItNdaSigned() {
		return itNdaSigned;
	}

	public void setItNdaSigned(Boolean itNdaSigned) {
		this.itNdaSigned = itNdaSigned;
	}

	public String getHospitalPatientName() {
		return hospitalPatientName;
	}

	public void setHospitalPatientName(String hospitalPatientName) {
		this.hospitalPatientName = hospitalPatientName;
	}

	public String getHospitalWardRoom() {
		return hospitalWardRoom;
	}

	public void setHospitalWardRoom(String hospitalWardRoom) {
		this.hospitalWardRoom = hospitalWardRoom;
	}

	public String getHospitalRelation() {
		return hospitalRelation;
	}

	public void setHospitalRelation(String hospitalRelation) {
		this.hospitalRelation = hospitalRelation;
	}

	public String getHospitalVisitTimeSlot() {
		return hospitalVisitTimeSlot;
	}

	public void setHospitalVisitTimeSlot(String hospitalVisitTimeSlot) {
		this.hospitalVisitTimeSlot = hospitalVisitTimeSlot;
	}

	public String getSchoolStudentName() {
		return schoolStudentName;
	}

	public void setSchoolStudentName(String schoolStudentName) {
		this.schoolStudentName = schoolStudentName;
	}

	public String getSchoolClass() {
		return schoolClass;
	}

	public void setSchoolClass(String schoolClass) {
		this.schoolClass = schoolClass;
	}

	public String getSchoolReason() {
		return schoolReason;
	}

	public void setSchoolReason(String schoolReason) {
		this.schoolReason = schoolReason;
	}
}
