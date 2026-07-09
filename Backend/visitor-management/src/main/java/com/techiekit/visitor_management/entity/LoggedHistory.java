package com.techiekit.visitor_management.entity;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "logged_history")
public class LoggedHistory {

	public enum Event {
		LOGIN,
		LOGOUT
	}

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(nullable = false)
	private String username;

	@Column
	private String email;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false)
	private Event event;

	@Column(name = "occurred_at", nullable = false)
	private Instant occurredAt;

	@Column(name = "system_ip")
	private String systemIp;

	@Column
	private String city;

	@Column
	private String state;

	@Column
	private String country;

	@Column
	private String system;

	@Column(name = "user_agent")
	private String userAgent;

	protected LoggedHistory() {
	}

	public LoggedHistory(String username, String email, Event event, Instant occurredAt, String systemIp, String userAgent) {
		this.username = username;
		this.email = email;
		this.event = event;
		this.occurredAt = occurredAt;
		this.systemIp = systemIp;
		this.userAgent = userAgent;
	}

	public Long getId() {
		return id;
	}

	public String getUsername() {
		return username;
	}

	public void setUsername(String username) {
		this.username = username;
	}

	public String getEmail() {
		return email;
	}

	public void setEmail(String email) {
		this.email = email;
	}

	public Event getEvent() {
		return event;
	}

	public void setEvent(Event event) {
		this.event = event;
	}

	public Instant getOccurredAt() {
		return occurredAt;
	}

	public void setOccurredAt(Instant occurredAt) {
		this.occurredAt = occurredAt;
	}

	public String getSystemIp() {
		return systemIp;
	}

	public void setSystemIp(String systemIp) {
		this.systemIp = systemIp;
	}

	public String getCity() {
		return city;
	}

	public void setCity(String city) {
		this.city = city;
	}

	public String getState() {
		return state;
	}

	public void setState(String state) {
		this.state = state;
	}

	public String getCountry() {
		return country;
	}

	public void setCountry(String country) {
		this.country = country;
	}

	public String getSystem() {
		return system;
	}

	public void setSystem(String system) {
		this.system = system;
	}

	public String getUserAgent() {
		return userAgent;
	}

	public void setUserAgent(String userAgent) {
		this.userAgent = userAgent;
	}
}

