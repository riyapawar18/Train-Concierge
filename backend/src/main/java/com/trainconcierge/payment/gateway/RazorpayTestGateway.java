package com.trainconcierge.payment.gateway;

import com.trainconcierge.payment.Payment;
import com.trainconcierge.config.PaymentProperties;
import com.trainconcierge.payment.dto.CheckoutResponse;
import com.trainconcierge.payment.dto.VerificationResult;
import com.trainconcierge.payment.dto.WebhookResult;
import com.trainconcierge.payment.dto.WebhookResult.Outcome;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Base64;

/**
 * Razorpay test‑mode gateway. Uses Razorpay's test API to create an order and verify signatures.
 * This implementation is deliberately lightweight and only covers the features needed for the
 * simulated demo flow (order creation, signature verification, and webhook handling).
 */
@Component
public class RazorpayTestGateway implements PaymentGateway {

    @Autowired
    private PaymentProperties props;

    private final RestTemplate restTemplate = new RestTemplate();

    private static final String RAZORPAY_ORDER_URL = "https://api.razorpay.com/v1/orders";
    private static final String RAZORPAY_PAYMENT_FETCH_URL = "https://api.razorpay.com/v1/payments/{paymentId}";

    @Override
    public CheckoutResponse createCheckout(Payment payment) {
        // Build request payload for Razorpay order creation
        MultiValueMap<String, Object> request = new LinkedMultiValueMap<>();
        request.add("amount", payment.getAmount().multiply(java.math.BigDecimal.valueOf(100)).intValue()); // in paise
        request.add("currency", payment.getCurrency());
        request.add("receipt", "payment_" + payment.getId());
        request.add("payment_capture", 1); // auto‑capture

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBasicAuth(props.getRazorpayKeyId(), props.getRazorpayKeySecret());

        HttpEntity<MultiValueMap<String, Object>> entity = new HttpEntity<>(request, headers);
        ResponseEntity<String> response = restTemplate.postForEntity(RAZORPAY_ORDER_URL, entity, String.class);
        // For simplicity we parse the minimal fields from the JSON response using a naive approach.
        // In production you would map to a proper DTO.
        String body = response.getBody();
        String orderId = extractJsonField(body, "id");
        String checkoutUrl = "https://checkout.razorpay.com/v1/checkout.js?order_id=" + orderId;

        CheckoutResponse resp = new CheckoutResponse();
        resp.setProvider("RAZORPAY");
        resp.setCheckoutUrl(checkoutUrl);
        resp.setOrderId(orderId);
        resp.setUpiLink(null);
        return resp;
    }

    @Override
    public VerificationResult verify(Payment payment, Object proof) {
        // "proof" is expected to be a map with razorpayPaymentId, razorpayOrderId, razorpaySignature
        @SuppressWarnings("unchecked")
        var map = (java.util.Map<String, String>) proof;
        String paymentId = map.get("razorpayPaymentId");
        String orderId = map.get("razorpayOrderId");
        String signature = map.get("razorpaySignature");

        // Verify signature: HMAC_SHA256(orderId|paymentId, secret)
        try {
            String payload = orderId + "|" + paymentId;
            MessageDigest sha256 = MessageDigest.getInstance("SHA-256");
            byte[] mac = javax.crypto.Mac.getInstance("HmacSHA256").doFinal(payload.getBytes(StandardCharsets.UTF_8));
        } catch (Exception e) {
            // ignored – fallback to manual HMAC calculation below
        }
        // Simpler: compute HMAC using javax.crypto.Mac
        try {
            javax.crypto.Mac mac = javax.crypto.Mac.getInstance("HmacSHA256");
            javax.crypto.spec.SecretKeySpec secretKey = new javax.crypto.spec.SecretKeySpec(props.getRazorpayKeySecret().getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            mac.init(secretKey);
            byte[] digest = mac.doFinal((orderId + "|" + paymentId).getBytes(StandardCharsets.UTF_8));
            String expectedSignature = Base64.getEncoder().encodeToString(digest);
            if (!expectedSignature.equals(signature)) {
                VerificationResult vr = new VerificationResult();
                vr.setStatus(VerificationResult.Status.FAILED);
                vr.setFailureReason("Invalid signature");
                return vr;
            }
        } catch (Exception ex) {
            VerificationResult vr = new VerificationResult();
            vr.setStatus(VerificationResult.Status.FAILED);
            vr.setFailureReason("Signature verification error");
            return vr;
        }

        // Fetch payment details from Razorpay to confirm amount
        String url = RAZORPAY_PAYMENT_FETCH_URL.replace("{paymentId}", paymentId);
        HttpHeaders authHeaders = new HttpHeaders();
        authHeaders.setBasicAuth(props.getRazorpayKeyId(), props.getRazorpayKeySecret());
        HttpEntity<Void> requestEntity = new HttpEntity<>(authHeaders);
        ResponseEntity<String> resp = restTemplate.exchange(url, HttpMethod.GET, requestEntity, String.class);
        String body = resp.getBody();
        String status = extractJsonField(body, "status");
        String amountStr = extractJsonField(body, "amount");
        // Convert amount back to rupees
        java.math.BigDecimal fetchedAmount = new java.math.BigDecimal(amountStr).divide(java.math.BigDecimal.valueOf(100));
        if (!fetchedAmount.equals(payment.getAmount())) {
            VerificationResult vr = new VerificationResult();
            vr.setStatus(VerificationResult.Status.FAILED);
            vr.setFailureReason("Amount mismatch");
            return vr;
        }
        VerificationResult vr = new VerificationResult();
        vr.setStatus("captured".equalsIgnoreCase(status) ? VerificationResult.Status.SUCCESS : VerificationResult.Status.PENDING);
        vr.setProviderPaymentId(paymentId);
        return vr;
    }

    @Override
    public WebhookResult handleWebhook(byte[] rawBody, String signatureHeader) {
        // Razorpay sends the webhook payload as JSON. Verify its signature.
        String payload = new String(rawBody, StandardCharsets.UTF_8);
        try {
            javax.crypto.Mac mac = javax.crypto.Mac.getInstance("HmacSHA256");
            javax.crypto.spec.SecretKeySpec secretKey = new javax.crypto.spec.SecretKeySpec(props.getRazorpayWebhookSecret().getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            mac.init(secretKey);
            String expected = Base64.getEncoder().encodeToString(mac.doFinal(payload.getBytes(StandardCharsets.UTF_8)));
            if (!expected.equals(signatureHeader)) {
                return new WebhookResult(Outcome.REJECTED, "Invalid webhook signature");
            }
        } catch (Exception e) {
            return new WebhookResult(Outcome.REJECTED, "Signature verification error");
        }
        // Extract event type and payment id (very naive parsing)
        String event = extractJsonField(payload, "event");
        String paymentId = extractJsonField(payload, "payload.payment.entity.id");
        if ("payment.captured".equals(event) || "payment.authorized".equals(event)) {
            return new WebhookResult(Outcome.APPLIED, "Payment captured: " + paymentId);
        }
        return new WebhookResult(Outcome.IGNORED, "Event not relevant: " + event);
    }

    // Very simplistic JSON field extractor – works for the limited test payloads.
    private String extractJsonField(String json, String fieldPath) {
        // fieldPath may be a dot‑separated path, we only support top‑level for now.
        String key = "\"" + fieldPath.replace('.', '\"') + "\":";
        int idx = json.indexOf(key);
        if (idx == -1) return null;
        int start = idx + key.length();
        int end = json.indexOf(",", start);
        int endObj = json.indexOf("}", start);
        if (end == -1 || (endObj != -1 && endObj < end)) end = endObj;
        String value = json.substring(start, end).trim();
        // Strip surrounding quotes if present
        if (value.startsWith("\"") && value.endsWith("\"")) {
            value = value.substring(1, value.length() - 1);
        }
        return value;
    }
}
