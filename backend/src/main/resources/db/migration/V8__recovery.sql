-- -------------------------------------------------
-- Phase 11 – Recovery & Rebooking schema
--
-- MySQL dialect, matching every other migration here; the original revision used
-- PostgreSQL BIGSERIAL/now()/inline REFERENCES and could not be applied to MySQL.
-- -------------------------------------------------

-- Rebookings table
CREATE TABLE rebookings (
    id                BIGINT      NOT NULL AUTO_INCREMENT,
    source_booking_id BIGINT      NOT NULL,
    new_booking_id    BIGINT      NULL,
    payment_id        BIGINT      NOT NULL,
    status            VARCHAR(20) NOT NULL,
    created_at        TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT uk_rebookings_payment UNIQUE (payment_id),
    CONSTRAINT chk_rebookings_status CHECK (status IN ('INITIATED', 'PENDING', 'SUCCESS', 'FAILED')),
    CONSTRAINT fk_rebookings_source_booking FOREIGN KEY (source_booking_id) REFERENCES bookings (id),
    CONSTRAINT fk_rebookings_new_booking FOREIGN KEY (new_booking_id) REFERENCES bookings (id),
    CONSTRAINT fk_rebookings_payment FOREIGN KEY (payment_id) REFERENCES payments (id)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci;

-- Extend payment_events to capture rebooking source
ALTER TABLE payment_events
    ADD COLUMN rebooking_id BIGINT NULL;

ALTER TABLE payment_events
    ADD CONSTRAINT fk_payment_events_rebooking FOREIGN KEY (rebooking_id) REFERENCES rebookings (id);

-- Bus seats (simple layout for each bus trip)
CREATE TABLE bus_seats (
    id          BIGINT      NOT NULL AUTO_INCREMENT,
    bus_trip_id BIGINT      NOT NULL,
    seat_code   VARCHAR(5)  NOT NULL, -- e.g. "1A", "2C"
    seat_type   VARCHAR(10) NOT NULL, -- "SLEEPER" or "SEATER"
    status      VARCHAR(10) NOT NULL, -- "FREE" "HELD" "BOOKED"
    held_by     BIGINT      NULL, -- user_id who holds the seat
    held_until  TIMESTAMP   NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_bus_seats_trip_seat UNIQUE (bus_trip_id, seat_code),
    CONSTRAINT chk_bus_seats_status CHECK (status IN ('FREE', 'HELD', 'BOOKED'))
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci;

-- Bus seat holds (mirrors train holds)
CREATE TABLE bus_holds (
    id          BIGINT      NOT NULL AUTO_INCREMENT,
    user_id     BIGINT      NOT NULL,
    bus_seat_id BIGINT      NOT NULL,
    expires_at  TIMESTAMP   NOT NULL,
    created_at  TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT uk_bus_holds_seat_user UNIQUE (bus_seat_id, user_id),
    CONSTRAINT fk_bus_holds_seat FOREIGN KEY (bus_seat_id) REFERENCES bus_seats (id)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci;

-- Acknowledgement of wait choice
CREATE TABLE wait_acknowledgements (
    id              BIGINT      NOT NULL AUTO_INCREMENT,
    journey_id      BIGINT      NOT NULL,
    user_id         BIGINT      NOT NULL,
    acknowledged_at TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT uk_wait_ack_journey_user UNIQUE (journey_id, user_id),
    CONSTRAINT fk_wait_ack_journey FOREIGN KEY (journey_id) REFERENCES journeys (id)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci;
