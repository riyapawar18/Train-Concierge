package com.trainconcierge.admin;

import java.time.LocalDateTime;

public record UserRoleEntry(
        Long id, String fullName, String email, String role,
        boolean enabled, LocalDateTime createdAt
) {}
