package com.techiekit.visitor_management.util;

/**
 * Builds a display phone string from a dial code + number.
 *
 * <p>Phone is stored as two columns ({@code phone_dial_code} + {@code phone_number}) and the
 * UI shows them concatenated. Some rows were saved with the full international number
 * (e.g. {@code "+91 93800 68757"}) in <em>both</em> columns — typically because the whole
 * number was pasted into a field that should only hold the {@code +91} code. Naive
 * concatenation then printed the number twice. When the number already carries the dial
 * code (comparing with whitespace removed), we return the number alone.
 */
public final class PhoneFormat {

	private PhoneFormat() {
	}

	public static String combine(String dialCode, String number) {
		var dial = dialCode == null ? "" : dialCode.trim();
		var num = number == null ? "" : number.trim();
		if (num.isEmpty()) return dial;
		if (dial.isEmpty()) return num;
		var compactNum = num.replaceAll("\\s+", "");
		var compactDial = dial.replaceAll("\\s+", "");
		if (compactNum.startsWith(compactDial)) return num;
		return dial + " " + num;
	}
}
