package com.techiekit.visitor_management.service;

/**
 * Turns a raw User-Agent header into a short, human-friendly "Browser on OS"
 * label (e.g. "Chrome on Windows") for the login-history "System" column.
 */
public final class UserAgentParser {

	private UserAgentParser() {
	}

	public static String describe(String userAgent) {
		if (userAgent == null || userAgent.isBlank()) {
			return null;
		}
		var ua = userAgent;
		var browser = browser(ua);
		var os = os(ua);
		if (browser == null && os == null) {
			return null;
		}
		if (browser == null) {
			return os;
		}
		if (os == null) {
			return browser;
		}
		return browser + " on " + os;
	}

	private static String browser(String ua) {
		// Order matters: Edge/Opera/Brave masquerade as Chrome; Chrome contains Safari.
		if (ua.contains("Edg/") || ua.contains("Edge/")) {
			return "Edge";
		}
		if (ua.contains("OPR/") || ua.contains("Opera")) {
			return "Opera";
		}
		if (ua.contains("Firefox/")) {
			return "Firefox";
		}
		if (ua.contains("Chrome/")) {
			return "Chrome";
		}
		if (ua.contains("Safari/")) {
			return "Safari";
		}
		if (ua.contains("MSIE") || ua.contains("Trident/")) {
			return "Internet Explorer";
		}
		return null;
	}

	private static String os(String ua) {
		if (ua.contains("Windows NT")) {
			return "Windows";
		}
		if (ua.contains("Android")) {
			return "Android";
		}
		if (ua.contains("iPhone") || ua.contains("iPad") || ua.contains("iPod")) {
			return "iOS";
		}
		if (ua.contains("Mac OS X") || ua.contains("Macintosh")) {
			return "macOS";
		}
		if (ua.contains("Linux")) {
			return "Linux";
		}
		return null;
	}
}
