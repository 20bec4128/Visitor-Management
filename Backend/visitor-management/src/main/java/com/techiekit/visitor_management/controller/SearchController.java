package com.techiekit.visitor_management.controller;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.techiekit.visitor_management.dto.SearchResultResponse;
import com.techiekit.visitor_management.service.SearchService;

@RestController
@RequestMapping("/api/search")
public class SearchController {

	private final SearchService searchService;

	public SearchController(SearchService searchService) {
		this.searchService = searchService;
	}

	// Any authenticated user (no @RequiresPermissions => valid token is enough).
	@GetMapping
	public List<SearchResultResponse> search(@RequestParam(name = "q", required = false) String q) {
		return searchService.search(q);
	}
}
