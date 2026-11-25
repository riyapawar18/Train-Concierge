package com.trainconcierge.auth.dto;

import com.trainconcierge.user.Role;

public record UserProfileResponse(Long id, String fullName, String email, Role role,
                                  String mobile, boolean emailAlerts) {
}
