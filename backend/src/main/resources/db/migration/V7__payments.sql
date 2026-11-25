/*
 * Flyway migration V7__payments.sql
 * Creates payment related tables.
 *
 * Written in the MySQL dialect used by every other migration in this folder. The first
 * revision of this file used PostgreSQL-only syntax (BIGSERIAL, NUMERIC, now(), inline
 * REFERENCES), which MySQL rejects, so the chain could never be applied to a real database.
 */

CREATE TABLE payments (
    id                  BIGINT         NOT NULL AUTO_INCREMENT,
    user_id             BIGINT         NOT NULL,
    purpose             VARCHAR(20)    NOT NULL, -- BOOKING|REBOOKING|HOTEL
    reference_type      VARCHAR(30)    NOT NULL,
    reference_id        BIGINT         NOT NULL,
    amount              DECIMAL(10, 2) NOT NULL,
    currency            VARCHAR(3)     NOT NULL DEFAULT 'INR',
    provider            VARCHAR(20)    NOT NULL, -- SIMULATED|RAZORPAY|UPI_INTENT
    verification_level  VARCHAR(20)    NOT NULL, -- SIMULATED|PROVIDER_VERIFIED|SELF_REPORTED
    charged_amount      DECIMAL(10, 2) NULL,
    utr                 VARCHAR(12)    NULL,
    method_hint         VARCHAR(20)    NULL,
    provider_order_id   VARCHAR(255)   NULL,
    provider_payment_id VARCHAR(255)   NULL,
    status              VARCHAR(20)    NOT NULL, -- INITIATED|PENDING|SUCCESS|FAILED|EXPIRED
    failure_reason      VARCHAR(30)    NULL,
    idempotency_key     VARCHAR(255)   NULL,
    created_at          TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at          TIMESTAMP      NOT NULL,
    version             INT            NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    CONSTRAINT uk_payments_provider_order_id UNIQUE (provider_order_id),
    CONSTRAINT uk_payments_provider_payment_id UNIQUE (provider_payment_id),
    CONSTRAINT uk_payments_idempotency_key UNIQUE (idempotency_key),
    CONSTRAINT fk_payments_user FOREIGN KEY (user_id) REFERENCES users (id)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci;

CREATE TABLE payment_events (
    id          BIGINT      NOT NULL AUTO_INCREMENT,
    payment_id  BIGINT      NOT NULL,
    from_status VARCHAR(20) NOT NULL,
    to_status   VARCHAR(20) NOT NULL,
    source      VARCHAR(20) NOT NULL, -- USER|WEBHOOK|VERIFY|JOB|SYSTEM
    note        VARCHAR(255) NULL,
    created_at  TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_payment_events_payment FOREIGN KEY (payment_id) REFERENCES payments (id)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci;

CREATE TABLE payment_webhook_log (
    id                BIGINT       NOT NULL AUTO_INCREMENT,
    provider_event_id VARCHAR(255) NOT NULL,
    event_type        VARCHAR(50)  NOT NULL,
    payment_id        BIGINT       NULL,
    received_at       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    outcome           VARCHAR(20)  NOT NULL, -- APPLIED|DUPLICATE|IGNORED|REJECTED
    PRIMARY KEY (id),
    CONSTRAINT uk_webhook_log_provider_event_id UNIQUE (provider_event_id),
    CONSTRAINT fk_webhook_log_payment FOREIGN KEY (payment_id) REFERENCES payments (id)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci;

CREATE TABLE refunds (
    id         BIGINT         NOT NULL AUTO_INCREMENT,
    payment_id BIGINT         NULL,
    booking_id BIGINT         NULL,
    amount     DECIMAL(10, 2) NOT NULL,
    status     VARCHAR(20)    NOT NULL, -- SIMULATED
    note       VARCHAR(255)   NULL,
    created_at TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_refunds_payment FOREIGN KEY (payment_id) REFERENCES payments (id),
    CONSTRAINT fk_refunds_booking FOREIGN KEY (booking_id) REFERENCES bookings (id)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci;
