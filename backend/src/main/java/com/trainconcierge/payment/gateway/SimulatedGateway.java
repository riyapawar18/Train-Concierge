package com.trainconcierge.payment.gateway;

import com.trainconcierge.payment.Payment;
import com.trainconcierge.payment.dto.CheckoutResponse;
import com.trainconcierge.payment.dto.VerificationResult;
import com.trainconcierge.payment.dto.WebhookResult;
import org.springframework.stereotype.Component;

/**
 * Simple simulated gateway used when {@code payment.mode=SIMULATED}.
 * It does not call any external service – it merely fabricates a checkout URL and
 * treats any verification request as successful.
 */
@Component
public class SimulatedGateway implements PaymentGateway {

    @Override
    public CheckoutResponse createCheckout(Payment payment) {
        // Build a dummy URL that could be shown to the user.
        String dummyUrl = "https://demo.payments.local/checkout/" + payment.getId();
        CheckoutResponse resp = new CheckoutResponse();
        resp.setProvider("SIMULATED");
        resp.setCheckoutUrl(dummyUrl);
        resp.setOrderId(null);
        resp.setUpiLink(null);
        return resp;
    }

    @Override
    public VerificationResult verify(Payment payment, Object proof) {
        // In simulated mode any proof is considered successful.
        VerificationResult result = new VerificationResult();
        result.setStatus(VerificationResult.Status.SUCCESS);
        result.setProviderPaymentId(null);
        result.setFailureReason(null);
        return result;
    }

    @Override
    public WebhookResult handleWebhook(byte[] rawBody, String signatureHeader) {
        // No real webhook in simulated mode – just ignore.
        return new WebhookResult(WebhookResult.Outcome.IGNORED, "Simulated gateway does not process webhooks");
    }
}
