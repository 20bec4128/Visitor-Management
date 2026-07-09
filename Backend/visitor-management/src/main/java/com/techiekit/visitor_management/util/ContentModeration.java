package com.techiekit.visitor_management.util;

import java.util.List;
import java.util.regex.Pattern;

/**
 * Lightweight text moderation for chat. Flags messages / captions / filenames that contain
 * clearly sexual or adult terms so they can be rejected before being stored or broadcast.
 * Word-boundary matching keeps false positives low (e.g. "class" won't trip "ass").
 */
public final class ContentModeration {

	// Clearly explicit / sexual terms. Kept focused to avoid blocking ordinary words.
	private static final List<String> BANNED = List.of(
			"porn", "porno", "pornography", "nude", "nudes", "nudity", "naked", "xxx", "nsfw",
			"sex", "sexual", "sexting", "orgasm", "masturbat", "blowjob", "handjob", "cum",
			"dick", "cock", "penis", "vagina", "pussy", "boobs", "boob", "tits", "titty",
			"horny", "slut", "whore", "escort", "hentai", "fetish", "erotic", "erotica",
			"camgirl", "onlyfans", "deepthroat", "anal", "creampie", "milf", "bdsm", "dildo");

	private static final Pattern PATTERN = Pattern.compile(
			"\\b(" + String.join("|", BANNED) + ")\\b", Pattern.CASE_INSENSITIVE);

	private ContentModeration() {
	}

	/** True if the text contains a prohibited adult/sexual term. */
	public static boolean isProhibited(String text) {
		if (text == null || text.isBlank()) {
			return false;
		}
		return PATTERN.matcher(text).find();
	}
}
