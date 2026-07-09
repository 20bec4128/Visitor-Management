package com.techiekit.visitor_management.service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@Service
public class FileStorageService {

	private final Path rootDir;

	public FileStorageService(@Value("${app.uploads.dir:uploads}") String uploadsDir) {
		this.rootDir = Paths.get(uploadsDir).toAbsolutePath().normalize();
	}

	/**
	 * Stores an image under {uploads}/{subdir} and returns a public-relative URL
	 * such as "/uploads/profile/<uuid>.jpg" that is served without auth.
	 */
	public String storeImage(MultipartFile file, String subdir) {
		if (file == null || file.isEmpty()) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No file uploaded");
		}
		var contentType = file.getContentType();
		if (contentType == null || !contentType.startsWith("image/")) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only image files are allowed");
		}

		try {
			var dir = rootDir.resolve(subdir).normalize();
			Files.createDirectories(dir);
			var filename = UUID.randomUUID().toString().replace("-", "") + extensionFor(file.getOriginalFilename());
			var target = dir.resolve(filename);
			try (var in = file.getInputStream()) {
				Files.copy(in, target, StandardCopyOption.REPLACE_EXISTING);
			}
			return "/uploads/" + subdir + "/" + filename;
		} catch (IOException e) {
			throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to store file");
		}
	}

	private static final java.util.Set<String> ALLOWED_EXT = java.util.Set.of(
			".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp",
			".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
			".txt", ".csv", ".zip", ".rar");

	private static final long MAX_BYTES = 20L * 1024 * 1024; // 20MB

	/**
	 * Stores any allowed attachment (image or common document) under {uploads}/{subdir} and returns
	 * a public-relative URL. Restricted to a safe extension allow-list and a size cap.
	 */
	public String storeFile(MultipartFile file, String subdir) {
		if (file == null || file.isEmpty()) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No file uploaded");
		}
		if (file.getSize() > MAX_BYTES) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "File is too large (max 20MB)");
		}
		var ext = extensionFor(file.getOriginalFilename());
		if (ext.isBlank() || !ALLOWED_EXT.contains(ext)) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "This file type is not allowed");
		}
		try {
			var dir = rootDir.resolve(subdir).normalize();
			Files.createDirectories(dir);
			var filename = UUID.randomUUID().toString().replace("-", "") + ext;
			var target = dir.resolve(filename);
			try (var in = file.getInputStream()) {
				Files.copy(in, target, StandardCopyOption.REPLACE_EXISTING);
			}
			return "/uploads/" + subdir + "/" + filename;
		} catch (IOException e) {
			throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to store file");
		}
	}

	public Path getRootDir() {
		return rootDir;
	}

	private static String extensionFor(String original) {
		if (original == null) {
			return "";
		}
		var dot = original.lastIndexOf('.');
		if (dot < 0 || dot == original.length() - 1) {
			return "";
		}
		var ext = original.substring(dot).toLowerCase();
		// Keep only a safe, simple extension.
		return ext.matches("\\.[a-z0-9]{1,5}") ? ext : "";
	}
}
