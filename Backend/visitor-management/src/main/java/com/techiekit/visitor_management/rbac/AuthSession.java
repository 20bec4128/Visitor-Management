package com.techiekit.visitor_management.rbac;

import java.util.Map;
import java.util.Set;

public record AuthSession(String username, String role, Map<String, Boolean> permissions) {

	public boolean hasPermission(String permissionKey) {
		if (permissionKey == null || permissionKey.isBlank()) {
			return true;
		}
		if (PermissionCatalog.isAdmin(role)) {
			return true;
		}
		return Boolean.TRUE.equals(permissions == null ? null : permissions.get(permissionKey));
	}

	public boolean hasAnyPermission(Set<String> permissionKeys) {
		if (permissionKeys == null || permissionKeys.isEmpty()) {
			return true;
		}
		if (PermissionCatalog.isAdmin(role)) {
			return true;
		}
		for (var key : permissionKeys) {
			if (hasPermission(key)) {
				return true;
			}
		}
		return false;
	}
}
