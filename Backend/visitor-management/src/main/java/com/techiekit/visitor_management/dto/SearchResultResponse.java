package com.techiekit.visitor_management.dto;

/**
 * A single global-search hit. {type} groups the result (Visitor / Staff / Visit /
 * Pre-Register), {route} is the frontend path to open when the user clicks it.
 */
public record SearchResultResponse(
		String type,
		Long id,
		String title,
		String subtitle,
		String route) {
}
