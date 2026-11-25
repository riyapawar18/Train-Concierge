package com.trainconcierge.common.error;

import java.time.Instant;
import java.util.List;

public record ApiError(
        Instant timestamp,
        int status,
        String code,
        String message,
        List<FieldErrorDetail> fieldErrors
) {

    public ApiError {
        fieldErrors = fieldErrors == null ? List.of() : List.copyOf(fieldErrors);
    }

    public static ApiError of(int status, String code, String message) {
        return new ApiError(Instant.now(), status, code, message, List.of());
    }

    public static ApiError of(int status, String code, String message, List<FieldErrorDetail> fieldErrors) {
        return new ApiError(Instant.now(), status, code, message, fieldErrors);
    }
}
