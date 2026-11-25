package com.trainconcierge.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Login credentials.
 *
 * The email field intentionally omits {@code @Email} so that leading/trailing
 * spaces typed on a mobile keyboard do not produce a 400 before the service
 * has a chance to trim and normalise the address. An unknown or malformed email
 * simply returns 401 — no information is leaked.
 */
public record LoginRequest(
        @NotBlank @Size(max = 190) String email,
        @NotBlank @Size(max = 200) String password
) {
}
