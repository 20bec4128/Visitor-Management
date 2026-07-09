package com.techiekit.visitor_management.service;

import java.util.ArrayList;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.techiekit.visitor_management.dto.SearchResultResponse;
import com.techiekit.visitor_management.repository.PreRegisterRequestRepository;
import com.techiekit.visitor_management.repository.StaffUserRepository;
import com.techiekit.visitor_management.repository.VisitRequestRepository;
import com.techiekit.visitor_management.repository.VisitorRepository;

/**
 * Lightweight global search across the main entities. Filtering is done in-memory
 * (fine at this app's scale) and capped per group so the topbar dropdown stays small.
 */
@Service
public class SearchService {

	private static final int PER_GROUP_LIMIT = 5;

	private final VisitorRepository visitorRepository;
	private final StaffUserRepository staffUserRepository;
	private final VisitRequestRepository visitRequestRepository;
	private final PreRegisterRequestRepository preRegisterRequestRepository;

	public SearchService(VisitorRepository visitorRepository, StaffUserRepository staffUserRepository,
			VisitRequestRepository visitRequestRepository, PreRegisterRequestRepository preRegisterRequestRepository) {
		this.visitorRepository = visitorRepository;
		this.staffUserRepository = staffUserRepository;
		this.visitRequestRepository = visitRequestRepository;
		this.preRegisterRequestRepository = preRegisterRequestRepository;
	}

	@Transactional(readOnly = true)
	public List<SearchResultResponse> search(String query) {
		var q = query == null ? "" : query.trim().toLowerCase();
		var results = new ArrayList<SearchResultResponse>();
		if (q.length() < 2) {
			return results;
		}

		visitorRepository.findAll().stream()
				.filter(v -> matches(q, v.getName(), v.getEmail(), v.getPhoneNumber(), v.getCompanyName()))
				.limit(PER_GROUP_LIMIT)
				.forEach(v -> results.add(new SearchResultResponse(
						"Visitor", v.getId(), v.getName(),
						joinNonBlank(v.getEmail(), v.getCompanyName()), "/visitors")));

		staffUserRepository.findAll().stream()
				.filter(s -> matches(q, s.getName(), s.getEmail(), s.getPhone()))
				.limit(PER_GROUP_LIMIT)
				.forEach(s -> results.add(new SearchResultResponse(
						"Staff", s.getId(), s.getName(), s.getEmail(), "/staff/users")));

		visitRequestRepository.findAll().stream()
				.filter(vr -> vr.getVisitor() != null
						&& matches(q, vr.getVisitor().getName(), vr.getVisitor().getEmail(),
								vr.getPurpose(), vr.getVisitCategory()))
				.limit(PER_GROUP_LIMIT)
				.forEach(vr -> results.add(new SearchResultResponse(
						"Visit", vr.getId(), vr.getVisitor().getName(),
						joinNonBlank(vr.getStatus() == null ? null : vr.getStatus().name(), vr.getPurpose()),
						"/today-visitor")));

		preRegisterRequestRepository.findAll().stream()
				.filter(p -> matches(q, p.getVisitorName(), p.getEmail(), p.getCompanyName()))
				.limit(PER_GROUP_LIMIT)
				.forEach(p -> results.add(new SearchResultResponse(
						"Pre-Register", p.getId(), p.getVisitorName(),
						joinNonBlank(p.getEmail(), p.getStatus() == null ? null : p.getStatus().name()),
						"/preregister")));

		return results;
	}

	private static boolean matches(String q, String... fields) {
		for (var field : fields) {
			if (field != null && field.toLowerCase().contains(q)) {
				return true;
			}
		}
		return false;
	}

	private static String joinNonBlank(String a, String b) {
		var left = a == null ? "" : a.trim();
		var right = b == null ? "" : b.trim();
		if (left.isEmpty()) return right;
		if (right.isEmpty()) return left;
		return left + " · " + right;
	}
}
