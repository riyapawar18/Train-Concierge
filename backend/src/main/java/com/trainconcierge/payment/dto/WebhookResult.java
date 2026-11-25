package com.trainconcierge.payment.dto;

/**
 * Result of processing a webhook payload.
 */
public class WebhookResult {
    public enum Outcome {
        APPLIED,
        DUPLICATE,
        IGNORED,
        REJECTED
    }

    private Outcome outcome;
    private String message;

    public WebhookResult() {}

    public WebhookResult(Outcome outcome, String message) {
        this.outcome = outcome;
        this.message = message;
    }

    public Outcome getOutcome() { return outcome; }
    public void setOutcome(Outcome outcome) { this.outcome = outcome; }
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
}
