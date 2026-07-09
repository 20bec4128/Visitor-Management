package com.techiekit.visitor_management.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

@Entity
@Table(name = "role_permissions",
		uniqueConstraints = { @UniqueConstraint(name = "uk_role_perm_role_key", columnNames = { "role_id", "permission_key" }) })
public class RolePermission {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(optional = false)
	@JoinColumn(name = "role_id", nullable = false)
	private Role role;

	@Column(name = "permission_key", nullable = false)
	private String permissionKey;

	@Column(nullable = false)
	private boolean allowed;

	protected RolePermission() {
	}

	public RolePermission(Role role, String permissionKey, boolean allowed) {
		this.role = role;
		this.permissionKey = permissionKey;
		this.allowed = allowed;
	}

	public Long getId() {
		return id;
	}

	public Role getRole() {
		return role;
	}

	public void setRole(Role role) {
		this.role = role;
	}

	public String getPermissionKey() {
		return permissionKey;
	}

	public void setPermissionKey(String permissionKey) {
		this.permissionKey = permissionKey;
	}

	public boolean isAllowed() {
		return allowed;
	}

	public void setAllowed(boolean allowed) {
		this.allowed = allowed;
	}
}

