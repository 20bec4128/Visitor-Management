package com.techiekit.visitor_management.rbac;

import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

public final class PermissionCatalog {

	public static final String STAFF_USERS_VIEW = "staff.users.view";
	public static final String STAFF_USERS_CREATE = "staff.users.create";
	public static final String STAFF_USERS_EDIT = "staff.users.edit";
	public static final String STAFF_USERS_DELETE = "staff.users.delete";

	public static final String STAFF_ROLES_VIEW = "staff.roles.view";
	public static final String STAFF_ROLES_MANAGE = "staff.roles.manage";

	public static final String STAFF_LOGGED_HISTORY_VIEW = "staff.logged-history.view";
	public static final String STAFF_LOGGED_HISTORY_DELETE = "staff.logged-history.delete";

	public static final String VISITORS_VIEW = "visitors.view";
	public static final String VISITORS_CREATE = "visitors.create";
	public static final String VISITORS_EDIT = "visitors.edit";
	public static final String VISITORS_DELETE = "visitors.delete";
	public static final String VISITORS_FACE_MATCH = "visitors.face.match";

	public static final String VISITS_VIEW = "visits.view";
	public static final String VISITS_CREATE = "visits.create";
	public static final String VISITS_EDIT = "visits.edit";
	public static final String VISITS_DELETE = "visits.delete";
	public static final String VISITS_APPROVE = "visits.approve";
	public static final String VISITS_REJECT = "visits.reject";
	public static final String VISITS_CHECKIN = "visits.checkin";
	public static final String VISITS_CHECKOUT = "visits.checkout";

	public static final String PREREGISTER_VIEW = "preregister.view";
	public static final String PREREGISTER_MANAGE = "preregister.manage";
	public static final String PREREGISTER_APPROVE = "preregister.approve";
	public static final String PREREGISTER_REJECT = "preregister.reject";
	public static final String PREREGISTER_ENTRY = "preregister.entry";

	public static final String CONTACT_VIEW = "contact.view";
	public static final String NOTICE_VIEW = "notice.view";
	public static final String NOTICE_MANAGE = "notice.manage";

	public static final String VISIT_CATEGORY_MANAGE = "visit-category.manage";
	public static final String ORGANIZATION_TYPE_MANAGE = "organization-type.manage";
	public static final String EMAIL_NOTIFICATION_MANAGE = "email-notification.manage";
	public static final String PRICING_MANAGE = "pricing.manage";
	public static final String PAYMENTS_VIEW = "payments.view";
	public static final String SETTINGS_MANAGE = "settings.manage";

	public static final String CHAT_USE = "chat.use";
	public static final String CHAT_CHANNELS_MANAGE = "chat.channels.manage";
	public static final String SOS_VIEW = "sos.view";
	public static final String SOS_RESOLVE = "sos.resolve";

	private static final List<String> ALL_PERMISSIONS = List.of(
			STAFF_USERS_VIEW,
			STAFF_USERS_CREATE,
			STAFF_USERS_EDIT,
			STAFF_USERS_DELETE,
			STAFF_ROLES_VIEW,
			STAFF_ROLES_MANAGE,
			STAFF_LOGGED_HISTORY_VIEW,
			STAFF_LOGGED_HISTORY_DELETE,
			VISITORS_VIEW,
			VISITORS_CREATE,
			VISITORS_EDIT,
			VISITORS_DELETE,
			VISITORS_FACE_MATCH,
			VISITS_VIEW,
			VISITS_CREATE,
			VISITS_EDIT,
			VISITS_DELETE,
			VISITS_APPROVE,
			VISITS_REJECT,
			VISITS_CHECKIN,
			VISITS_CHECKOUT,
			PREREGISTER_VIEW,
			PREREGISTER_MANAGE,
			PREREGISTER_APPROVE,
			PREREGISTER_REJECT,
			PREREGISTER_ENTRY,
			CONTACT_VIEW,
			NOTICE_VIEW,
			NOTICE_MANAGE,
			VISIT_CATEGORY_MANAGE,
			ORGANIZATION_TYPE_MANAGE,
			EMAIL_NOTIFICATION_MANAGE,
			PRICING_MANAGE,
			PAYMENTS_VIEW,
			SETTINGS_MANAGE,
			CHAT_USE,
			CHAT_CHANNELS_MANAGE,
			SOS_VIEW,
			SOS_RESOLVE
	);

	private PermissionCatalog() {
	}

	public static Set<String> allPermissions() {
		return new LinkedHashSet<>(ALL_PERMISSIONS);
	}

	public static Map<String, Boolean> adminPermissions() {
		return toPermissionMap(allPermissions());
	}

	public static Map<String, Boolean> managerPermissions() {
		return toPermissionMap(Set.of(
				STAFF_USERS_VIEW,
				STAFF_USERS_CREATE,
				STAFF_USERS_EDIT,
				STAFF_USERS_DELETE,
				STAFF_ROLES_VIEW,
				STAFF_ROLES_MANAGE,
				STAFF_LOGGED_HISTORY_VIEW,
				VISITORS_VIEW,
				VISITS_VIEW,
				VISITS_APPROVE,
				VISITS_REJECT,
				PREREGISTER_VIEW,
				PREREGISTER_APPROVE,
				PREREGISTER_REJECT,
				CONTACT_VIEW,
				NOTICE_VIEW,
				NOTICE_MANAGE,
				ORGANIZATION_TYPE_MANAGE,
				PAYMENTS_VIEW,
				CHAT_USE,
				SOS_VIEW,
				SOS_RESOLVE));
	}

	public static Map<String, Boolean> receptionistPermissions() {
		return toPermissionMap(Set.of(
				VISITORS_VIEW,
				VISITORS_CREATE,
				VISITORS_EDIT,
				VISITORS_DELETE,
				VISITS_VIEW,
				VISITS_CREATE,
				VISITS_DELETE,
				PREREGISTER_VIEW,
				PREREGISTER_MANAGE,
				CONTACT_VIEW,
				NOTICE_VIEW,
				NOTICE_MANAGE,
				CHAT_USE,
				SOS_VIEW));
	}

	public static Map<String, Boolean> securityPermissions() {
		return toPermissionMap(Set.of(
				VISITORS_VIEW,
				VISITORS_FACE_MATCH,
				VISITS_VIEW,
				VISITS_CHECKIN,
				VISITS_CHECKOUT,
				PREREGISTER_VIEW,
				PREREGISTER_ENTRY,
				CONTACT_VIEW,
				NOTICE_VIEW,
				CHAT_USE,
				SOS_VIEW,
				SOS_RESOLVE));
	}

	public static Map<String, Boolean> employeePermissions() {
		// Employees only see and act on the requests raised against them (host-scoped in
		// VisitRequestService / PreRegisterService). They may approve/reject both walk-in
		// visits (Host Approvals) and pre-booking requests (Appointment Bookings), but have
		// NO pre-register *management* (create/edit) and NO check-in/check-out rights.
		return toPermissionMap(Set.of(
				VISITS_VIEW,
				VISITS_APPROVE,
				VISITS_REJECT,
				PREREGISTER_VIEW,
				PREREGISTER_APPROVE,
				PREREGISTER_REJECT,
				CONTACT_VIEW,
				NOTICE_VIEW,
				CHAT_USE,
				SOS_VIEW));
	}

	public static Map<String, Boolean> defaultPermissionsForRole(String roleTitle) {
		var role = normalize(roleTitle);
		return switch (role) {
			case "ADMIN" -> adminPermissions();
			case "MANAGER" -> managerPermissions();
			case "RECEPTIONIST" -> receptionistPermissions();
			case "SECURITY" -> securityPermissions();
			case "EMPLOYEE" -> employeePermissions();
			default -> Map.of();
		};
	}

	public static boolean isAdmin(String roleTitle) {
		return "ADMIN".equalsIgnoreCase(normalize(roleTitle));
	}

	private static Map<String, Boolean> toPermissionMap(Set<String> keys) {
		var out = new LinkedHashMap<String, Boolean>();
		for (var key : keys) {
			out.put(key, Boolean.TRUE);
		}
		return out;
	}

	private static String normalize(String value) {
		return value == null ? "" : value.trim();
	}
}
