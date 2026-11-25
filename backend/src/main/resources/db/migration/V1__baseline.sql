CREATE TABLE IF NOT EXISTS schema_info (
    id          BIGINT       NOT NULL AUTO_INCREMENT,
    info_key    VARCHAR(100) NOT NULL,
    info_value  VARCHAR(255) NOT NULL,
    created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_schema_info_key (info_key)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci;

INSERT IGNORE INTO schema_info (info_key, info_value)
VALUES ('baseline_version', '1');
