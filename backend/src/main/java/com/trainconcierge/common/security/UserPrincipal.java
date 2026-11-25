package com.trainconcierge.common.security;

import com.trainconcierge.user.Role;

public record UserPrincipal(Long id, String email, Role role) {
}
