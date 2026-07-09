package com.techiekit.visitor_management.dto;

import java.util.List;

public record FaceMatchResponse(
		boolean matched,
		Double similarity,
		MatchedVisitorResponse visitor,
		List<RecentVisitResponse> recentVisits,
		Boolean alreadyCheckedIn) {
}

