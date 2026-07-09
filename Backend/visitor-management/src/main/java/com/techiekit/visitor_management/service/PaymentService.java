package com.techiekit.visitor_management.service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.Base64;
import java.util.Collections;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.techiekit.visitor_management.dto.CreateOrderResponse;
import com.techiekit.visitor_management.dto.PaymentConfigResponse;
import com.techiekit.visitor_management.dto.PaymentResponse;
import com.techiekit.visitor_management.dto.VerifyPaymentRequest;
import com.techiekit.visitor_management.entity.Payment;
import com.techiekit.visitor_management.repository.AppSettingRepository;
import com.techiekit.visitor_management.repository.PaymentRepository;

/**
 * Razorpay payment integration driven by the "payment" settings section
 * (gateway / keyId / keySecret / currency / enabled) configured in the Settings
 * UI. Orders are created and signatures verified server-side (the keySecret
 * never leaves the backend).
 */
@Service
public class PaymentService {

	private final AppSettingRepository appSettingRepository;
	private final PaymentRepository paymentRepository;
	private final ObjectMapper objectMapper;
	private final HttpClient httpClient;
	private final String razorpayApiBase;

	public PaymentService(AppSettingRepository appSettingRepository, PaymentRepository paymentRepository,
			ObjectMapper objectMapper,
			@Value("${razorpay.api.url:https://api.razorpay.com}") String razorpayApiBase) {
		this.appSettingRepository = appSettingRepository;
		this.paymentRepository = paymentRepository;
		this.objectMapper = objectMapper;
		this.razorpayApiBase = razorpayApiBase;
		this.httpClient = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();
	}

	private Map<String, Object> settings() {
		return appSettingRepository.findById("payment").map(setting -> {
			try {
				var json = setting.getValueJson();
				if (json == null || json.isBlank()) {
					return Collections.<String, Object>emptyMap();
				}
				return objectMapper.readValue(json, new TypeReference<Map<String, Object>>() {
				});
			} catch (Exception e) {
				return Collections.<String, Object>emptyMap();
			}
		}).orElseGet(Collections::emptyMap);
	}

	private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter
			.ofPattern("MMM dd, yyyy hh:mm a", Locale.ENGLISH).withZone(ZoneOffset.UTC);

	@Transactional(readOnly = true)
	public List<PaymentResponse> list() {
		return paymentRepository.findAllByOrderByCreatedAtDesc().stream().map(p -> new PaymentResponse(
				p.getId(), p.getGateway(), p.getOrderId(), p.getPaymentId(), p.getAmount(), p.getCurrency(),
				p.getStatus(), p.getPurpose(), p.getVisitorName(), p.getVisitCategory(),
				DATE_FORMAT.format(p.getCreatedAt()))).collect(Collectors.toList());
	}

	/** Public config the frontend needs (keyId is publishable; keySecret is NOT returned). */
	public PaymentConfigResponse config() {
		var cfg = settings();
		var gateway = str(cfg.get("gateway"));
		var keyId = str(cfg.get("keyId"));
		var enabled = bool(cfg.get("enabled")) && !keyId.isBlank();
		var currency = str(cfg.get("currency"));
		return new PaymentConfigResponse(enabled, gateway, keyId, currency.isBlank() ? "INR" : currency);
	}

	public CreateOrderResponse createOrder(int amountMajor, String purpose) {
		var cfg = settings();
		requireEnabledRazorpay(cfg);
		if (amountMajor <= 0) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Amount must be greater than zero");
		}
		var keyId = str(cfg.get("keyId"));
		var keySecret = str(cfg.get("keySecret"));
		var currency = str(cfg.get("currency"));
		if (currency.isBlank()) {
			currency = "INR";
		}
		var amountMinor = (long) amountMajor * 100; // rupees -> paise

		try {
			var body = objectMapper.writeValueAsString(Map.of(
					"amount", amountMinor,
					"currency", currency,
					"receipt", "vms_" + Instant.now().toEpochMilli(),
					"payment_capture", 1));
			var auth = Base64.getEncoder()
					.encodeToString((keyId + ":" + keySecret).getBytes(StandardCharsets.UTF_8));
			var request = HttpRequest.newBuilder()
					.uri(URI.create(razorpayApiBase + "/v1/orders"))
					.timeout(Duration.ofSeconds(20))
					.header("Authorization", "Basic " + auth)
					.header("Content-Type", "application/json")
					.POST(HttpRequest.BodyPublishers.ofString(body))
					.build();
			var response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
			if (response.statusCode() < 200 || response.statusCode() >= 300) {
				throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
						"Payment gateway rejected the order: " + briefError(response.body()));
			}
			JsonNode node = objectMapper.readTree(response.body());
			var orderId = node.path("id").asText("");
			if (orderId.isBlank()) {
				throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Payment gateway returned no order id");
			}
			return new CreateOrderResponse(orderId, keyId, amountMinor, currency, "Razorpay");
		} catch (ResponseStatusException e) {
			throw e;
		} catch (Exception e) {
			throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Could not reach the payment gateway: "
					+ (e.getMessage() == null ? e.getClass().getSimpleName() : e.getMessage()));
		}
	}

	@Transactional
	public Payment verifyAndRecord(VerifyPaymentRequest req) {
		var cfg = settings();
		requireEnabledRazorpay(cfg);
		if (req == null || isBlank(req.orderId()) || isBlank(req.paymentId()) || isBlank(req.signature())) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "orderId, paymentId and signature are required");
		}
		var keySecret = str(cfg.get("keySecret"));
		var expected = hmacSha256Hex(req.orderId() + "|" + req.paymentId(), keySecret);
		if (!constantTimeEquals(expected, req.signature().trim())) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Payment signature verification failed");
		}

		var currency = str(cfg.get("currency"));
		var payment = new Payment();
		payment.setGateway("Razorpay");
		payment.setOrderId(req.orderId());
		payment.setPaymentId(req.paymentId());
		payment.setAmount(req.amount() == null ? 0 : req.amount());
		payment.setCurrency(currency.isBlank() ? "INR" : currency);
		payment.setStatus("PAID");
		payment.setPurpose(nullToNull(req.purpose()));
		payment.setVisitorName(nullToNull(req.visitorName()));
		payment.setVisitCategory(nullToNull(req.visitCategory()));
		payment.setCreatedAt(Instant.now());
		return paymentRepository.save(payment);
	}

	private void requireEnabledRazorpay(Map<String, Object> cfg) {
		if (!bool(cfg.get("enabled"))) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Online payments are not enabled in Settings.");
		}
		var gateway = str(cfg.get("gateway"));
		if (!gateway.isBlank() && !"razorpay".equalsIgnoreCase(gateway)) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
					"Only Razorpay is supported right now (configured: " + gateway + ").");
		}
		if (str(cfg.get("keyId")).isBlank() || str(cfg.get("keySecret")).isBlank()) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
					"Payment Key ID / Key Secret are not configured in Settings.");
		}
	}

	private static String hmacSha256Hex(String data, String secret) {
		try {
			var mac = Mac.getInstance("HmacSHA256");
			mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
			var raw = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
			var sb = new StringBuilder(raw.length * 2);
			for (var b : raw) {
				sb.append(Character.forDigit((b >> 4) & 0xF, 16));
				sb.append(Character.forDigit(b & 0xF, 16));
			}
			return sb.toString();
		} catch (Exception e) {
			throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Signature computation failed");
		}
	}

	private static boolean constantTimeEquals(String a, String b) {
		if (a == null || b == null || a.length() != b.length()) {
			return false;
		}
		var result = 0;
		for (var i = 0; i < a.length(); i++) {
			result |= a.charAt(i) ^ b.charAt(i);
		}
		return result == 0;
	}

	private static String briefError(String body) {
		if (body == null) {
			return "";
		}
		return body.length() > 300 ? body.substring(0, 300) : body;
	}

	private static String str(Object v) {
		return v == null ? "" : v.toString().trim();
	}

	private static boolean bool(Object v) {
		if (v instanceof Boolean b) {
			return b;
		}
		return "true".equalsIgnoreCase(str(v));
	}

	private static boolean isBlank(String v) {
		return v == null || v.trim().isBlank();
	}

	private static String nullToNull(String v) {
		var t = v == null ? "" : v.trim();
		return t.isBlank() ? null : t;
	}
}
