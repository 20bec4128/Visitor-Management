package com.techiekit.visitor_management.util;

import java.io.ByteArrayOutputStream;
import java.util.UUID;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;

public class TokenAndQRGenerator {

	private TokenAndQRGenerator() {
		// Utility class
	}

	/**
	 * Generate a unique approval token
	 */
	public static String generateToken() {
		return UUID.randomUUID().toString().replace("-", "").substring(0, 16).toUpperCase();
	}

	/**
	 * Generate QR code as base64 image for embedding in emails
	 */
	public static String generateQRCodeBase64(String token) {
		try {
			QRCodeWriter writer = new QRCodeWriter();
			BitMatrix bits = writer.encode(token, BarcodeFormat.QR_CODE, 300, 300);

			ByteArrayOutputStream pngOutputStream = new ByteArrayOutputStream();
			MatrixToImageWriter.writeToStream(bits, "PNG", pngOutputStream);
			byte[] pngData = pngOutputStream.toByteArray();

			String base64Image = java.util.Base64.getEncoder().encodeToString(pngData);
			return "data:image/png;base64," + base64Image;
		} catch (Exception e) {
			throw new RuntimeException("Failed to generate QR code", e);
		}
	}
}
