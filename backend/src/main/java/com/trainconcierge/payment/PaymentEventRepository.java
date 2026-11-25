package com.trainconcierge.payment;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface PaymentEventRepository extends JpaRepository<PaymentEvent, Long> {
    List<PaymentEvent> findByPaymentId(Long paymentId);
}
