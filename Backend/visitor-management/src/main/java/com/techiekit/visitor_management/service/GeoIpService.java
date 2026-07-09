package com.techiekit.visitor_management.service;

import java.net.InetAddress;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * Resolves a public IP address to an approximate location via a free
 * IP-geolocation API. Best-effort: returns an empty result (never throws) for
 * private/loopback IPs, network failures, or non-success responses, so the
 * login flow is never blocked or broken by it.
 */
@Service
public class GeoIpService {

	private static final Logger log = LoggerFactory.getLogger(GeoIpService.class);

	public record GeoLocation(String city, String state, String country) {
		static final GeoLocation EMPTY = new GeoLocation(null, null, null);
	}

	private final HttpClient httpClient;
	private final ObjectMapper objectMapper;
	private final String apiBase;
	private final boolean enabled;

	public GeoIpService(ObjectMapper objectMapper,
			@Value("${geoip.api.url:http://ip-api.com/json}") String apiBase,
			@Value("${geoip.enabled:true}") boolean enabled) {
		this.httpClient = HttpClient.newBuilder()
				.connectTimeout(Duration.ofSeconds(2))
				.version(HttpClient.Version.HTTP_1_1)
				.build();
		this.objectMapper = objectMapper;
		this.apiBase = apiBase;
		this.enabled = enabled;
	}

	public GeoLocation lookup(String ip) {
		if (!enabled || ip == null || ip.isBlank() || isPrivateOrLoopback(ip)) {
			return GeoLocation.EMPTY;
		}
		try {
			var request = HttpRequest.newBuilder()
					.uri(URI.create(apiBase + "/" + ip + "?fields=status,country,regionName,city"))
					.timeout(Duration.ofSeconds(2))
					.GET()
					.build();
			var response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
			if (response.statusCode() < 200 || response.statusCode() >= 300) {
				return GeoLocation.EMPTY;
			}
			JsonNode node = objectMapper.readTree(response.body());
			if (!"success".equalsIgnoreCase(node.path("status").asText(""))) {
				return GeoLocation.EMPTY;
			}
			return new GeoLocation(
					blankToNull(node.path("city").asText("")),
					blankToNull(node.path("regionName").asText("")),
					blankToNull(node.path("country").asText("")));
		} catch (Exception e) {
			// Offline, timeout, rate-limited, etc. — silently skip enrichment.
			log.debug("GeoIP lookup for {} skipped: {}", ip, e.getMessage());
			return GeoLocation.EMPTY;
		}
	}

	private static boolean isPrivateOrLoopback(String ip) {
		try {
			var addr = InetAddress.getByName(ip);
			return addr.isLoopbackAddress() || addr.isSiteLocalAddress() || addr.isAnyLocalAddress()
					|| addr.isLinkLocalAddress();
		} catch (Exception e) {
			return true; // unparseable → treat as non-geolocatable
		}
	}

	private static String blankToNull(String value) {
		var v = value == null ? "" : value.trim();
		return v.isBlank() ? null : v;
	}
}
