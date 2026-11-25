package com.trainconcierge.auth.dto;

import com.trainconcierge.user.Role;

public record UserSummaryResponse(Long id, String fullName, String email, Role role) {
}
