package com.trainconcierge.auth;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;

public interface RevokedTokenRepository extends JpaRepository<RevokedToken, String> {

    long deleteByExpiresAtBefore(LocalDateTime cutoff);
}
