package com.techiekit.visitor_management.entity;

import java.util.HashSet;
import java.util.Set;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

@Entity
@Table(name = "roles", uniqueConstraints = { @UniqueConstraint(name = "uk_roles_title", columnNames = "title") })
public class Role {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(nullable = false, unique = true)
	private String title;

	@Column(nullable = false)
	private int level;

	@OneToMany(mappedBy = "role", cascade = CascadeType.ALL, orphanRemoval = true)
	private Set<RolePermission> permissions = new HashSet<>();

	@ManyToMany(mappedBy = "roles")
	private Set<StaffUser> staffUsers = new HashSet<>();

	protected Role() {
	}

	public Role(String title, int level) {
		this.title = title;
		this.level = level;
	}

	public Long getId() {
		return id;
	}

	public String getTitle() {
		return title;
	}

	public void setTitle(String title) {
		this.title = title;
	}

	public int getLevel() {
		return level;
	}

	public void setLevel(int level) {
		this.level = level;
	}

	public Set<RolePermission> getPermissions() {
		return permissions;
	}

	public void setPermissions(Set<RolePermission> permissions) {
		this.permissions = permissions;
	}

	public Set<StaffUser> getStaffUsers() {
		return staffUsers;
	}

	public void setStaffUsers(Set<StaffUser> staffUsers) {
		this.staffUsers = staffUsers;
	}
}
