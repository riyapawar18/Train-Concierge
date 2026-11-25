-- Phase 09: notifications, seat-alert throttling and per-passenger preferences.
-- Numbered 7.1 because V7 is taken by the payments tables, which V8 recovery foreign-keys
-- to and therefore cannot move; the notifications tables only need to land before the V10
-- index that reads them, and Flyway applies 7.1 between 7 and 8.

CREATE TABLE notifications (
    id              BIGINT        NOT NULL AUTO_INCREMENT,
    user_id         BIGINT        NOT NULL,
    type            VARCHAR(30)   NOT NULL,
    title           VARCHAR(190)  NOT NULL,
    body            VARCHAR(1000) NOT NULL,
    link_path       VARCHAR(255)  NULL,
    entity_type     VARCHAR(40)   NULL,
    entity_id       BIGINT        NULL,
    channel         VARCHAR(10)   NOT NULL,
    delivery_status VARCHAR(20)   NOT NULL,
    delivery_error  VARCHAR(300)  NULL,
    attempts        INT           NOT NULL DEFAULT 0,
    read_at         TIMESTAMP     NULL,
    created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    sent_at         TIMESTAMP     NULL,
    PRIMARY KEY (id),
    CONSTRAINT chk_notifications_type CHECK (type IN
        ('DISRUPTION', 'DISRUPTION_UPDATED', 'DISRUPTION_RESOLVED', 'SEAT_ALERT',
         'BOOKING_CONFIRMED', 'REBOOKING_CONFIRMED', 'HOTEL_AT_RISK', 'HOTEL_UPDATE',
         'PAYMENT', 'SYSTEM', 'ANNOUNCEMENT')),
    CONSTRAINT chk_notifications_channel CHECK (channel IN ('IN_APP', 'EMAIL')),
    CONSTRAINT chk_notifications_delivery CHECK (delivery_status IN
        ('PENDING', 'SENT', 'FAILED')),
    CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users (id),
    KEY idx_notifications_feed (user_id, channel, created_at),
    KEY idx_notifications_unread (user_id, channel, read_at),
    KEY idx_notifications_delivery (channel, delivery_status, attempts)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci;

CREATE TABLE seat_alert_log (
    id           BIGINT      NOT NULL AUTO_INCREMENT,
    user_id      BIGINT      NOT NULL,
    train_number VARCHAR(8)  NOT NULL,
    travel_date  DATE        NOT NULL,
    class_code   VARCHAR(4)  NOT NULL,
    seats_left   INT         NOT NULL,
    created_at   TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT uk_seat_alert_log_user_train_date UNIQUE (user_id, train_number, travel_date),
    CONSTRAINT fk_seat_alert_log_user FOREIGN KEY (user_id) REFERENCES users (id),
    CONSTRAINT fk_seat_alert_log_train FOREIGN KEY (train_number) REFERENCES trains (number),
    KEY idx_seat_alert_log_recent (user_id, created_at)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci;

CREATE TABLE user_preferences (
    user_id                    BIGINT   NOT NULL,
    email_enabled              BOOLEAN  NOT NULL DEFAULT TRUE,
    seat_alerts_enabled        BOOLEAN  NOT NULL DEFAULT TRUE,
    disruption_alerts_enabled  BOOLEAN  NOT NULL DEFAULT TRUE,
    announcements_enabled      BOOLEAN  NOT NULL DEFAULT TRUE,
    PRIMARY KEY (user_id),
    CONSTRAINT fk_user_preferences_user FOREIGN KEY (user_id) REFERENCES users (id)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci;
