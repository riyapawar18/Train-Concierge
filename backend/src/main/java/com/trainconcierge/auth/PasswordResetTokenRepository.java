package com.trainconcierge.auth;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;

public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, String> {

    long deleteByUserId(Long userId);

    long deleteByExpiresAtBefore(LocalDateTime cutoff);
}
