package com.trainconcierge.admin;

import java.time.LocalDateTime;

public record PassengerSummary(
        Long id, String fullName, String email, String mobile,
        long journeyCount, boolean enabled, LocalDateTime createdAt
) {}
