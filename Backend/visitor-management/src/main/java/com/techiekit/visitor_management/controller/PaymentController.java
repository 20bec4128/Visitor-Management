package com.techiekit.visitor_management.controller;

import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.techiekit.visitor_management.dto.CreateOrderRequest;
import com.techiekit.visitor_management.dto.CreateOrderResponse;
import com.techiekit.visitor_management.dto.PaymentConfigResponse;
import com.techiekit.visitor_management.dto.PaymentResponse;
import com.techiekit.visitor_management.dto.VerifyPaymentRequest;
import com.techiekit.visitor_management.rbac.PermissionCatalog;
import com.techiekit.visitor_management.rbac.RequiresPermissions;
import com.techiekit.visitor_management.service.PaymentService;

/**
 * Payment endpoints used by the Create-Visitor flow when a paid visit category
 * is selected. Any authenticated user (e.g. receptionist) may collect a payment.
 */
@RestController
@RequestMapping("/api/payments")
public class PaymentController {

	private final PaymentService paymentService;

	public PaymentController(PaymentService paymentService) {
		this.paymentService = paymentService;
	}

	@GetMapping
	@RequiresPermissions({ PermissionCatalog.PAYMENTS_VIEW })
	public List<PaymentResponse> list() {
		return paymentService.list();
	}

	@GetMapping("/config")
	public PaymentConfigResponse config() {
		return paymentService.config();
	}

	@PostMapping("/order")
	public CreateOrderResponse createOrder(@RequestBody CreateOrderRequest request) {
		if (request == null || request.amount() == null) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "amount is required");
		}
		return paymentService.createOrder(request.amount(), request.purpose());
	}

	@PostMapping("/verify")
	public Map<String, Object> verify(@RequestBody VerifyPaymentRequest request) {
		var payment = paymentService.verifyAndRecord(request);
		return Map.of("paid", true, "paymentId", payment.getPaymentId(), "id", payment.getId());
	}
}
