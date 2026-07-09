package com.techiekit.visitor_management.rbac;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Base64;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import com.fasterxml.jackson.databind.ObjectMapper;

@Service
public class AuthTokenService {

	private final ObjectMapper objectMapper;
	private final byte[] secret;

	public AuthTokenService(ObjectMapper objectMapper, @Value("${app.auth.secret:visitor-management-dev-secret}") String secret) {
		this.objectMapper = objectMapper;
		this.secret = secret == null ? new byte[0] : secret.getBytes(StandardCharsets.UTF_8);
	}

	public String createToken(String username) {
		try {
			var payload = new TokenPayload(username == null ? "" : username.trim(), System.currentTimeMillis());
			var payloadJson = objectMapper.writeValueAsString(payload);
			var payloadPart = base64Url(payloadJson.getBytes(StandardCharsets.UTF_8));
			var signaturePart = base64Url(sign(payloadPart));
			return payloadPart + "." + signaturePart;
		} catch (Exception e) {
			throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Unable to create auth token");
		}
	}

	public String verifyAndGetUsername(String token) {
		if (token == null || token.isBlank()) {
			throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Missing auth token");
		}

		try {
			var parts = token.trim().split("\\.");
			if (parts.length != 2) {
				throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid auth token");
			}

			var payloadPart = parts[0];
			var signaturePart = parts[1];
			var expectedSignature = base64Url(sign(payloadPart));
			if (!MessageDigest.isEqual(signaturePart.getBytes(StandardCharsets.UTF_8), expectedSignature.getBytes(StandardCharsets.UTF_8))) {
				throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid auth token");
			}

			var payloadBytes = Base64.getUrlDecoder().decode(payloadPart);
			var payload = objectMapper.readValue(payloadBytes, TokenPayload.class);
			if (payload == null || payload.username() == null || payload.username().isBlank()) {
				throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid auth token");
			}
			return payload.username();
		} catch (ResponseStatusException e) {
			throw e;
		} catch (Exception e) {
			throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid auth token");
		}
	}

	private byte[] sign(String payloadPart) throws Exception {
		var mac = Mac.getInstance("HmacSHA256");
		mac.init(new SecretKeySpec(secret, "HmacSHA256"));
		return mac.doFinal(payloadPart.getBytes(StandardCharsets.UTF_8));
	}

	private static String base64Url(byte[] bytes) {
		return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
	}

	public record TokenPayload(String username, long issuedAt) {
	}
}
