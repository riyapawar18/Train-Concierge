-- Phase 07: bookings, booking passengers and passenger-facing journeys.
-- The phase brief names this file V4__bookings.sql, but V4 is already used by seat holds,
-- so the migration is numbered V5 to keep Flyway's ordering intact.

CREATE TABLE bookings (
    id                  BIGINT        NOT NULL AUTO_INCREMENT,
    pnr                 VARCHAR(10)   NOT NULL,
    user_id             BIGINT        NOT NULL,
    train_number        VARCHAR(8)    NOT NULL,
    travel_date         DATE          NOT NULL,
    from_station        VARCHAR(8)    NOT NULL,
    to_station          VARCHAR(8)    NOT NULL,
    boarding_time       TIMESTAMP     NOT NULL,
    arrival_time        TIMESTAMP     NOT NULL,
    class_code          VARCHAR(4)    NOT NULL,
    quota               VARCHAR(20)   NOT NULL,
    status              VARCHAR(20)   NOT NULL,
    base_fare           DECIMAL(10, 2) NOT NULL,
    reservation_charge  DECIMAL(10, 2) NOT NULL,
    gst                 DECIMAL(10, 2) NOT NULL,
    total_fare          DECIMAL(10, 2) NOT NULL,
    refund_amount       DECIMAL(10, 2) NULL,
    refund_percent      INT           NULL,
    source_booking_id   BIGINT        NULL,
    contact_email       VARCHAR(190)  NULL,
    contact_mobile      VARCHAR(20)   NULL,
    created_at          TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    cancelled_at        TIMESTAMP     NULL,
    version             BIGINT        NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    CONSTRAINT uk_bookings_pnr UNIQUE (pnr),
    CONSTRAINT chk_bookings_status CHECK (status IN
        ('HELD', 'CONFIRMED', 'REBOOKED', 'CANCELLED')),
    CONSTRAINT fk_bookings_user FOREIGN KEY (user_id) REFERENCES users (id),
    CONSTRAINT fk_bookings_train FOREIGN KEY (train_number) REFERENCES trains (number),
    CONSTRAINT fk_bookings_from_station FOREIGN KEY (from_station) REFERENCES stations (code),
    CONSTRAINT fk_bookings_to_station FOREIGN KEY (to_station) REFERENCES stations (code),
    CONSTRAINT fk_bookings_source FOREIGN KEY (source_booking_id) REFERENCES bookings (id),
    KEY idx_bookings_user (user_id, travel_date),
    KEY idx_bookings_pnr (pnr)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci;

CREATE TABLE booking_passengers (
    id                BIGINT       NOT NULL AUTO_INCREMENT,
    booking_id        BIGINT       NOT NULL,
    name              VARCHAR(120) NOT NULL,
    age               INT          NOT NULL,
    gender            VARCHAR(10)  NOT NULL,
    berth_preference  VARCHAR(4)   NULL,
    seat_inventory_id BIGINT       NULL,
    seat_label        VARCHAR(24)  NOT NULL,
    coach_no          VARCHAR(8)   NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT chk_booking_passengers_gender CHECK (gender IN ('MALE', 'FEMALE', 'OTHER')),
    CONSTRAINT fk_booking_passengers_booking FOREIGN KEY (booking_id) REFERENCES bookings (id),
    CONSTRAINT fk_booking_passengers_seat FOREIGN KEY (seat_inventory_id)
        REFERENCES seat_inventory (id),
    KEY idx_booking_passengers_booking (booking_id)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci;

CREATE TABLE journeys (
    id            BIGINT       NOT NULL AUTO_INCREMENT,
    user_id       BIGINT       NOT NULL,
    booking_id    BIGINT       NOT NULL,
    title         VARCHAR(120) NULL,
    status        VARCHAR(20)  NOT NULL,
    disruption_id BIGINT       NULL,
    notes         VARCHAR(500) NULL,
    created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP    NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_journeys_booking UNIQUE (booking_id),
    CONSTRAINT chk_journeys_status CHECK (status IN
        ('UPCOMING', 'ACTIVE', 'DISRUPTED', 'REBOOKED', 'COMPLETED', 'CANCELLED')),
    CONSTRAINT fk_journeys_user FOREIGN KEY (user_id) REFERENCES users (id),
    CONSTRAINT fk_journeys_booking FOREIGN KEY (booking_id) REFERENCES bookings (id),
    KEY idx_journeys_user (user_id, status)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci;
