package com.trainconcierge.admin;

import com.trainconcierge.auth.JwtAuthFilter;
import com.trainconcierge.auth.RevokedToken;
import com.trainconcierge.auth.RevokedTokenRepository;
import com.trainconcierge.common.error.ApiException;
import com.trainconcierge.common.security.PasswordPolicy;
import com.trainconcierge.user.User;
import com.trainconcierge.user.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;

@Service
public class ProfileService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final RevokedTokenRepository revokedTokenRepository;

    public ProfileService(UserRepository userRepository,
                          PasswordEncoder passwordEncoder,
                          RevokedTokenRepository revokedTokenRepository) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.revokedTokenRepository = revokedTokenRepository;
    }

    @Transactional(readOnly = true)
    public ProfileResponse getProfile(Long userId) {
        User user = userRepository.findById(userId).orElseThrow(ApiException::notFound);
        return toResponse(user);
    }

    @Transactional
    public ProfileResponse updateProfile(Long userId, String fullName, String mobile) {
        User user = userRepository.findById(userId).orElseThrow(ApiException::notFound);
        if (fullName != null && !fullName.isBlank()) {
            user.setFullName(fullName.trim());
        }
        if (mobile != null) {
            user.setMobile(mobile.isBlank() ? null : mobile.trim());
        }
        userRepository.save(user);
        return toResponse(user);
    }

    @Transactional
    public void changePassword(Long userId, String currentPassword, String newPassword,
                               HttpServletRequest request) {
        User user = userRepository.findById(userId).orElseThrow(ApiException::notFound);
        if (!passwordEncoder.matches(currentPassword, user.getPasswordHash())) {
            throw ApiException.validation("currentPassword", "Current password is incorrect.");
        }
        if (!PasswordPolicy.isValid(newPassword)) {
            throw ApiException.validation("newPassword", PasswordPolicy.MESSAGE);
        }
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        // Revoke current token so the user must sign in again
        revokeCurrentToken(request);
    }

    private void revokeCurrentToken(HttpServletRequest request) {
        Object token = request.getAttribute(JwtAuthFilter.TOKEN_ATTRIBUTE);
        if (token instanceof com.trainconcierge.auth.JwtService.ParsedToken parsed) {
            if (!revokedTokenRepository.existsById(parsed.jti())) {
                LocalDateTime expiresAt = LocalDateTime.ofInstant(
                        parsed.expiresAt(), ZoneOffset.UTC);
                revokedTokenRepository.save(new RevokedToken(parsed.jti(), expiresAt));
            }
        }
    }

    private static ProfileResponse toResponse(User user) {
        return new ProfileResponse(user.getId(), user.getFullName(), user.getEmail(),
                user.getMobile(), user.getRole().name());
    }
}
