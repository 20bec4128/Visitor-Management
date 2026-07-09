package com.techiekit.visitor_management.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.techiekit.visitor_management.entity.Payment;

public interface PaymentRepository extends JpaRepository<Payment, Long> {
	List<Payment> findAllByOrderByCreatedAtDesc();
}
