package com.trainconcierge.payment;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface PaymentWebhookLogRepository extends JpaRepository<PaymentWebhookLog, Long> {
    Optional<PaymentWebhookLog> findByProviderEventId(String providerEventId);
}
