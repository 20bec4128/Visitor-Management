package com.techiekit.visitor_management.rbac;

import java.util.Arrays;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.server.ResponseStatusException;

import com.techiekit.visitor_management.entity.Role;
import com.techiekit.visitor_management.entity.RolePermission;
import com.techiekit.visitor_management.repository.RoleRepository;
import com.techiekit.visitor_management.repository.UserRepository;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@Component
public class RbacInterceptor implements HandlerInterceptor {

	private final AuthTokenService authTokenService;
	private final UserRepository userRepository;
	private final RoleRepository roleRepository;

	public RbacInterceptor(AuthTokenService authTokenService, UserRepository userRepository, RoleRepository roleRepository) {
		this.authTokenService = authTokenService;
		this.userRepository = userRepository;
		this.roleRepository = roleRepository;
	}

	@Override
	public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
		try {
			if (!(handler instanceof HandlerMethod handlerMethod)) {
				return true;
			}

			if (request.getMethod().equalsIgnoreCase("OPTIONS")) {
				return true;
			}

			if (isAnonymous(handlerMethod)) {
				return true;
			}

			var authHeader = request.getHeader(HttpHeaders.AUTHORIZATION);
			if (authHeader == null || !authHeader.startsWith("Bearer ")) {
				throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required");
			}

			var username = authTokenService.verifyAndGetUsername(authHeader.substring("Bearer ".length()));
			var appUser = userRepository.findByUsernameIgnoreCase(username)
					.orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required"));

			var rolePermissions = resolvePermissions(appUser.getRole());
			var session = new AuthSession(appUser.getUsername(), appUser.getRole(), rolePermissions);
			AuthContext.set(session);
			request.setAttribute(AuthSession.class.getName(), session);

			var requiredPermissions = getRequiredPermissions(handlerMethod);
			if (!requiredPermissions.isEmpty() && !session.hasAnyPermission(requiredPermissions)) {
				throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You do not have permission to access this resource");
			}

			return true;
		} catch (ResponseStatusException e) {
			response.setStatus(e.getStatusCode().value());
			response.setContentType("application/json");
			response.getWriter().write("{\"message\":\"" + escapeJson(e.getReason()) + "\"}");
			return false;
		}
	}

	@Override
	public void afterCompletion(HttpServletRequest request, HttpServletResponse response, Object handler, Exception ex) {
		AuthContext.clear();
	}

	private Map<String, Boolean> resolvePermissions(String roleTitle) {
		if (PermissionCatalog.isAdmin(roleTitle)) {
			return PermissionCatalog.adminPermissions();
		}

		var role = roleRepository.findByTitleIgnoreCaseWithPermissions(roleTitle).orElse(null);
		if (role == null) {
			return Map.of();
		}

		return role.getPermissions().stream()
				.filter(RolePermission::isAllowed)
				.collect(Collectors.toMap(
						RolePermission::getPermissionKey,
						ignored -> Boolean.TRUE,
						(left, right) -> left,
						java.util.LinkedHashMap::new));
	}

	private boolean isAnonymous(HandlerMethod handlerMethod) {
		return handlerMethod.hasMethodAnnotation(AnonymousAccess.class)
				|| handlerMethod.getBeanType().isAnnotationPresent(AnonymousAccess.class);
	}

	private java.util.Set<String> getRequiredPermissions(HandlerMethod handlerMethod) {
		var permissions = new java.util.LinkedHashSet<String>();
		var classAnnotation = handlerMethod.getBeanType().getAnnotation(RequiresPermissions.class);
		if (classAnnotation != null) {
			permissions.addAll(Arrays.asList(classAnnotation.value()));
		}

		var methodAnnotation = handlerMethod.getMethodAnnotation(RequiresPermissions.class);
		if (methodAnnotation != null) {
			permissions.addAll(Arrays.asList(methodAnnotation.value()));
		}

		return permissions;
	}

	private static String escapeJson(String value) {
		if (value == null) {
			return "Access denied";
		}
		return value.replace("\\", "\\\\").replace("\"", "\\\"");
	}
}
