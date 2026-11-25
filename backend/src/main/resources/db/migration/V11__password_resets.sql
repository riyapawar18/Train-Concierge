-- Password-reset tokens for the forgot-password flow.
-- Only the SHA-256 hash of the token is stored, so a leaked table cannot mint resets.

CREATE TABLE password_reset_tokens (
    token_hash VARCHAR(64) NOT NULL,
    user_id    BIGINT      NOT NULL,
    expires_at TIMESTAMP   NOT NULL,
    used_at    TIMESTAMP   NULL,
    created_at TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (token_hash),
    CONSTRAINT fk_password_reset_tokens_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    KEY idx_password_reset_tokens_user (user_id),
    KEY idx_password_reset_tokens_expires_at (expires_at)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci;
