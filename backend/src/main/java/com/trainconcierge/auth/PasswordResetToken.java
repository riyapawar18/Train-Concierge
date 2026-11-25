package com.trainconcierge.auth;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.LocalDateTime;

/**
 * One outstanding forgot-password link. {@code tokenHash} is the SHA-256 of the random token that
 * travels in the email, so the table alone can never be used to reset a password.
 */
@Entity
@Table(name = "password_reset_tokens")
public class PasswordResetToken {

    @Id
    @Column(name = "token_hash", length = 64)
    private String tokenHash;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    @Column(name = "used_at")
    private LocalDateTime usedAt;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    protected PasswordResetToken() {
    }

    public PasswordResetToken(String tokenHash, Long userId, LocalDateTime createdAt,
                              LocalDateTime expiresAt) {
        this.tokenHash = tokenHash;
        this.userId = userId;
        this.createdAt = createdAt;
        this.expiresAt = expiresAt;
    }

    public String getTokenHash() {
        return tokenHash;
    }

    public Long getUserId() {
        return userId;
    }

    public LocalDateTime getExpiresAt() {
        return expiresAt;
    }

    public LocalDateTime getUsedAt() {
        return usedAt;
    }

    public boolean isRedeemableAt(LocalDateTime now) {
        return usedAt == null && !now.isAfter(expiresAt);
    }

    public void markUsedAt(LocalDateTime now) {
        this.usedAt = now;
    }
}
