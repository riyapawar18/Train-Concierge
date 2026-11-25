package com.trainconcierge.auth;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.LocalDateTime;

@Entity
@Table(name = "revoked_tokens")
public class RevokedToken {

    @Id
    @Column(length = 64)
    private String jti;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    protected RevokedToken() {
    }

    public RevokedToken(String jti, LocalDateTime expiresAt) {
        this.jti = jti;
        this.expiresAt = expiresAt;
    }

    public String getJti() {
        return jti;
    }

    public LocalDateTime getExpiresAt() {
        return expiresAt;
    }
}
