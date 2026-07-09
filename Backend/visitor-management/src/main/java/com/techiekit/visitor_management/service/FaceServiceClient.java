package com.techiekit.visitor_management.service;

import java.net.URI;
import java.net.http.HttpConnectTimeoutException;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.techiekit.visitor_management.dto.FaceEncodeResponse;

@Service
public class FaceServiceClient {

	private final HttpClient httpClient;
	private final ObjectMapper objectMapper;
	private final URI baseUri;

	public FaceServiceClient(
			ObjectMapper objectMapper,
			@Value("${face.service.url:http://127.0.0.1:8000}") String faceServiceUrl) {
		this.httpClient = HttpClient.newBuilder()
				.connectTimeout(Duration.ofSeconds(8))
				.version(HttpClient.Version.HTTP_1_1)
				.build();
		this.objectMapper = objectMapper;
		this.baseUri = URI.create(faceServiceUrl);
	}

	public List<Double> encode(String imageBase64) {
		if (imageBase64 == null || imageBase64.trim().isBlank()) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "imageBase64 is required");
		}

		try {
			var body = objectMapper.writeValueAsString(Map.of("imageBase64", imageBase64));
			var request = HttpRequest.newBuilder()
					.uri(baseUri.resolve("/embed"))
					.timeout(Duration.ofSeconds(25))
					.header("Content-Type", "application/json")
					.POST(HttpRequest.BodyPublishers.ofString(body))
					.build();

			var response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
			if (response.statusCode() >= 200 && response.statusCode() < 300) {
				var parsed = objectMapper.readValue(response.body(), FaceEncodeResponse.class);
				if (parsed == null || parsed.embedding() == null || parsed.embedding().isEmpty()) {
					throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "No face detected in image");
				}
				return parsed.embedding();
			}

			throw new ResponseStatusException(
					HttpStatus.BAD_GATEWAY,
					"Face service error (" + response.statusCode() + "). Ensure face-service is running at " + baseUri);
		} catch (ResponseStatusException e) {
			throw e;
		} catch (HttpConnectTimeoutException e) {
			throw new ResponseStatusException(
					HttpStatus.SERVICE_UNAVAILABLE,
					"Cannot connect to face-service at " + baseUri + " (timeout). Start it from Backend/face-service on port 8000.");
		} catch (Exception e) {
			throw new ResponseStatusException(
					HttpStatus.SERVICE_UNAVAILABLE,
					"Cannot reach face-service at " + baseUri + ". Start it from Backend/face-service on port 8000. Details: " + e.getMessage());
		}
	}
}
