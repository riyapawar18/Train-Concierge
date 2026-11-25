package com.trainconcierge.auth.dto;

public record LoginResponse(String accessToken, String tokenType, long expiresInSeconds,
                            UserSummaryResponse user) {
}
