package com.techiekit.visitor_management.dto;

/**
 * Returns an approved booking's entry token and its QR code (a {@code data:image/png;base64,...}
 * data URL) so the host can view/share the same QR the visitor receives by email.
 */
public record PreRegisterQrResponse(
		long id,
		String token,
		String qrCode) {
}
