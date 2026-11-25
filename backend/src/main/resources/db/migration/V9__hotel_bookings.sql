CREATE TABLE IF NOT EXISTS hotel_bookings (
    id                 BIGINT         NOT NULL AUTO_INCREMENT,
    user_id            BIGINT         NOT NULL,
    journey_id         BIGINT         NULL,
    hotel_id           BIGINT         NOT NULL,
    room_id            BIGINT         NOT NULL,
    check_in_date      DATE           NOT NULL,
    check_in_time      TIME           NOT NULL,
    check_out_date     DATE           NOT NULL,
    check_out_time     TIME           NOT NULL,
    guests             INT            NOT NULL DEFAULT 1,
    total_price        DECIMAL(10,2)  NOT NULL,
    status             VARCHAR(25)    NOT NULL,
    late_arrival_cutoff TIME          NULL,
    notes              VARCHAR(500)   NULL,
    manual_entry       BOOLEAN        NOT NULL DEFAULT FALSE,
    created_at         TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version            BIGINT         NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    CONSTRAINT chk_hotel_bookings_status CHECK (status IN
        ('CONFIRMED','LATE_ARRIVAL_NOTED','AT_RISK','SHIFTED','CANCELLED')),
    CONSTRAINT fk_hotel_bookings_user FOREIGN KEY (user_id) REFERENCES users (id),
    CONSTRAINT fk_hotel_bookings_journey FOREIGN KEY (journey_id) REFERENCES journeys (id),
    CONSTRAINT fk_hotel_bookings_hotel FOREIGN KEY (hotel_id) REFERENCES hotels (id),
    CONSTRAINT fk_hotel_bookings_room FOREIGN KEY (room_id) REFERENCES hotel_rooms (id),
    KEY idx_hotel_bookings_user (user_id, created_at),
    KEY idx_hotel_bookings_journey (journey_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS hotel_extension_requests (
    id                 BIGINT         NOT NULL AUTO_INCREMENT,
    hotel_booking_id   BIGINT         NOT NULL,
    type               VARCHAR(20)    NOT NULL,
    requested_time     TIME           NULL,
    requested_date     DATE           NULL,
    status             VARCHAR(15)    NOT NULL,
    fee_estimate       DECIMAL(10,2)  NULL,
    response_note      VARCHAR(500)   NULL,
    created_at         TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resolved_at        TIMESTAMP      NULL,
    PRIMARY KEY (id),
    CONSTRAINT chk_hotel_ext_type CHECK (type IN
        ('LATE_ARRIVAL','LATE_CHECKOUT','EXTRA_NIGHT','SHIFT_STAY')),
    CONSTRAINT chk_hotel_ext_status CHECK (status IN
        ('REQUESTED','APPROVED','DECLINED','NOT_NEEDED')),
    CONSTRAINT fk_hotel_ext_booking FOREIGN KEY (hotel_booking_id)
        REFERENCES hotel_bookings (id),
    KEY idx_hotel_ext_booking (hotel_booking_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS hotel_impacts (
    id                        BIGINT        NOT NULL AUTO_INCREMENT,
    impact_id                 BIGINT        NOT NULL,
    hotel_booking_id          BIGINT        NOT NULL,
    new_arrival_at            TIMESTAMP     NOT NULL,
    arrival_vs_checkin_minutes INT          NOT NULL,
    verdict                   VARCHAR(40)   NOT NULL,
    summary                   VARCHAR(500)  NOT NULL,
    created_at                TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT uk_hotel_impacts UNIQUE (impact_id, hotel_booking_id),
    CONSTRAINT chk_hotel_impacts_verdict CHECK (verdict IN
        ('UNAFFECTED','LATE_ARRIVAL_OK','PAST_CUTOFF_EXTENSION_POSSIBLE',
         'PAST_CUTOFF_NO_EXTENSION','NIGHT_LOST','CHECKOUT_PRESSURE')),
    CONSTRAINT fk_hotel_impacts_impact FOREIGN KEY (impact_id)
        REFERENCES journey_impacts (id),
    CONSTRAINT fk_hotel_impacts_booking FOREIGN KEY (hotel_booking_id)
        REFERENCES hotel_bookings (id),
    KEY idx_hotel_impacts_impact (impact_id),
    KEY idx_hotel_impacts_booking (hotel_booking_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;
