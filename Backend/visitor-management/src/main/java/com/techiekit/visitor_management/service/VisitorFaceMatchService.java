package com.techiekit.visitor_management.service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.techiekit.visitor_management.dto.FaceMatchResponse;
import com.techiekit.visitor_management.dto.MatchedVisitorResponse;
import com.techiekit.visitor_management.dto.RecentVisitResponse;
import com.techiekit.visitor_management.entity.VisitRequest;
import com.techiekit.visitor_management.entity.VisitRequest.Status;
import com.techiekit.visitor_management.repository.VisitRequestRepository;
import com.techiekit.visitor_management.repository.VisitorFaceRepository;

@Service
public class VisitorFaceMatchService {

	private static final TypeReference<List<Double>> EMBEDDING_TYPE = new TypeReference<>() {
	};

	private final VisitorFaceRepository visitorFaceRepository;
	private final VisitRequestRepository visitRequestRepository;
	private final FaceServiceClient faceServiceClient;
	private final ObjectMapper objectMapper;
	private final double threshold;

	public VisitorFaceMatchService(
			VisitorFaceRepository visitorFaceRepository,
			VisitRequestRepository visitRequestRepository,
			FaceServiceClient faceServiceClient,
			ObjectMapper objectMapper,
			@Value("${face.match.threshold:0.5}") double threshold) {
		this.visitorFaceRepository = visitorFaceRepository;
		this.visitRequestRepository = visitRequestRepository;
		this.faceServiceClient = faceServiceClient;
		this.objectMapper = objectMapper;
		this.threshold = threshold;
	}

	@Transactional(readOnly = true)
	public FaceMatchResponse match(String imageBase64) {
		var queryEmbedding = faceServiceClient.encode(imageBase64);
		var faces = visitorFaceRepository.findAll();
		if (faces.isEmpty()) {
			return new FaceMatchResponse(false, null, null, List.of(), false);
		}

		Match best = null;
		for (var face : faces) {
			var embeddingJson = face.getEmbeddingJson();
			var stored = parseEmbedding(embeddingJson);
			var similarity = cosineSimilarity(queryEmbedding, stored);
			if (best == null || similarity > best.similarity()) {
				best = new Match(face.getVisitor().getId(), similarity);
			}
		}

		if (best == null || best.similarity() < threshold) {
			return new FaceMatchResponse(false, best == null ? null : best.similarity(), null, List.of(), false);
		}

		var matchedFace = visitorFaceRepository.findByVisitorId(best.visitorId()).orElseThrow();
		var visitor = matchedFace.getVisitor();

		boolean alreadyCheckedIn = false;
		if (visitRequestRepository.existsByVisitorIdAndStatus(visitor.getId(), Status.CHECKED_IN)) {
			alreadyCheckedIn = true;
		}
		var cleanEmail = visitor.getEmail() == null ? "" : visitor.getEmail().trim();
		if (!alreadyCheckedIn && !cleanEmail.isEmpty() && visitRequestRepository.existsByVisitorEmailIgnoreCaseAndStatus(cleanEmail, Status.CHECKED_IN)) {
			alreadyCheckedIn = true;
		}

		var visitorDto = new MatchedVisitorResponse(
				visitor.getId(),
				visitor.getName(),
				visitor.getEmail(),
				visitor.getPhoneDialCode(),
				visitor.getPhoneNumber(),
				visitor.getOrganizationType(),
				visitor.getCompanyName(),
				visitor.getIdProofType(),
				visitor.getIdProofNumber());

		var recent = visitRequestRepository.findTop10ByVisitorIdOrderByVisitAtDesc(visitor.getId()).stream()
				.sorted(Comparator.comparing(VisitRequest::getVisitAt, Comparator.nullsLast(Comparator.reverseOrder())))
				.map((req) -> new RecentVisitResponse(
						req.getId(),
						req.getVisitAt(),
						req.getStatus().name(),
						req.getPurpose(),
						req.getHostUser() == null ? null : req.getHostUser().getId(),
						req.getHostUser() == null ? null : req.getHostUser().getName()))
				.toList();

		return new FaceMatchResponse(true, best.similarity(), visitorDto, recent, alreadyCheckedIn);
	}

	private List<Double> parseEmbedding(String embeddingJson) {
		if (embeddingJson == null || embeddingJson.isBlank()) {
			throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Stored face embedding missing");
		}
		try {
			var parsed = objectMapper.readValue(embeddingJson, EMBEDDING_TYPE);
			return parsed == null ? new ArrayList<>() : parsed;
		} catch (Exception e) {
			throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Stored face embedding is invalid JSON");
		}
	}

	private static double cosineSimilarity(List<Double> a, List<Double> b) {
		if (a == null || b == null || a.isEmpty() || b.isEmpty()) return 0.0;
		int len = Math.min(a.size(), b.size());
		double dot = 0.0;
		double na = 0.0;
		double nb = 0.0;
		for (int i = 0; i < len; i++) {
			var av = a.get(i) == null ? 0.0 : a.get(i);
			var bv = b.get(i) == null ? 0.0 : b.get(i);
			dot += av * bv;
			na += av * av;
			nb += bv * bv;
		}
		if (na == 0.0 || nb == 0.0) return 0.0;
		return dot / (Math.sqrt(na) * Math.sqrt(nb));
	}

	private record Match(Long visitorId, Double similarity) {
	}
}

