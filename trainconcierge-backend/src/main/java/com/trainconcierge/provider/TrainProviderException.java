package com.trainconcierge.provider;

/**
 * Thrown when a train data provider call fails in a way that is distinct from an empty result.
 * Callers must not treat this as zero trains — they must surface the error to the user.
 */
public class TrainProviderException extends RuntimeException {

    public enum Reason {
        MISSING_CREDENTIALS,
        AUTHENTICATION_FAILURE,
        RATE_LIMITED,
        PROVIDER_TIMEOUT,
        PROVIDER_ERROR,
        INVALID_STATION,
        INTERNAL_ERROR
    }

    private final Reason reason;

    public TrainProviderException(Reason reason, String message) {
        super(message);
        this.reason = reason;
    }

    public TrainProviderException(Reason reason, String message, Throwable cause) {
        super(message, cause);
        this.reason = reason;
    }

    public Reason getReason() {
        return reason;
    }
}
