-- Phase 08: disruptions, journey impacts and ranked recommendations.
-- The phase brief names this file V5__disruptions.sql, but V5 is already used by bookings,
-- so the migration is numbered V6 to keep Flyway's ordering intact.

CREATE TABLE disruptions (
    id             BIGINT       NOT NULL AUTO_INCREMENT,
    train_number   VARCHAR(8)   NOT NULL,
    travel_date    DATE         NOT NULL,
    type           VARCHAR(20)  NOT NULL,
    delay_minutes  INT          NULL,
    reason         VARCHAR(190) NOT NULL,
    severity       VARCHAR(20)  NOT NULL,
    status         VARCHAR(20)  NOT NULL,
    created_by     BIGINT       NOT NULL,
    created_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resolved_at    TIMESTAMP    NULL,
    resolved_by    BIGINT       NULL,
    version        BIGINT       NOT NULL DEFAULT 0,
    -- 1 while the disruption is ACTIVE and NULL once resolved, so the unique key below
    -- forbids a second ACTIVE disruption while keeping the resolved history.
    active_marker  INT          NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_disruptions_active UNIQUE (train_number, travel_date, active_marker),
    CONSTRAINT chk_disruptions_type CHECK (type IN ('DELAY', 'CANCELLATION')),
    CONSTRAINT chk_disruptions_severity CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH')),
    CONSTRAINT chk_disruptions_status CHECK (status IN ('ACTIVE', 'RESOLVED')),
    CONSTRAINT fk_disruptions_train FOREIGN KEY (train_number) REFERENCES trains (number),
    CONSTRAINT fk_disruptions_creator FOREIGN KEY (created_by) REFERENCES users (id),
    CONSTRAINT fk_disruptions_resolver FOREIGN KEY (resolved_by) REFERENCES users (id),
    KEY idx_disruptions_train_date (train_number, travel_date),
    KEY idx_disruptions_status (status, created_at)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci;

CREATE TABLE journey_impacts (
    id                BIGINT       NOT NULL AUTO_INCREMENT,
    disruption_id     BIGINT       NOT NULL,
    journey_id        BIGINT       NOT NULL,
    booking_id        BIGINT       NOT NULL,
    original_arrival  TIMESTAMP    NOT NULL,
    new_arrival       TIMESTAMP    NULL,
    delay_minutes     INT          NOT NULL,
    missed_connection BOOLEAN      NOT NULL DEFAULT FALSE,
    overnight         BOOLEAN      NOT NULL DEFAULT FALSE,
    needs_hotel       BOOLEAN      NOT NULL DEFAULT FALSE,
    impact_level      VARCHAR(20)  NOT NULL,
    summary           VARCHAR(300) NOT NULL,
    created_at        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT uk_journey_impacts_disruption_booking UNIQUE (disruption_id, booking_id),
    CONSTRAINT chk_journey_impacts_level CHECK (impact_level IN
        ('MINOR', 'MODERATE', 'SEVERE')),
    CONSTRAINT fk_journey_impacts_disruption FOREIGN KEY (disruption_id)
        REFERENCES disruptions (id),
    CONSTRAINT fk_journey_impacts_journey FOREIGN KEY (journey_id) REFERENCES journeys (id),
    CONSTRAINT fk_journey_impacts_booking FOREIGN KEY (booking_id) REFERENCES bookings (id),
    KEY idx_journey_impacts_journey (journey_id),
    KEY idx_journey_impacts_booking (booking_id)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci;

CREATE TABLE recommendations (
    id               BIGINT        NOT NULL AUTO_INCREMENT,
    impact_id        BIGINT        NOT NULL,
    kind             VARCHAR(10)   NOT NULL,
    ref_train_number VARCHAR(8)    NULL,
    ref_bus_trip_id  BIGINT        NULL,
    class_code       VARCHAR(4)    NULL,
    from_station     VARCHAR(8)    NOT NULL,
    to_station       VARCHAR(8)    NOT NULL,
    departure_at     TIMESTAMP     NOT NULL,
    arrival_at       TIMESTAMP     NOT NULL,
    fare             DECIMAL(10, 2) NOT NULL,
    seats_available  INT           NOT NULL,
    score            INT           NOT NULL,
    `rank`           INT           NOT NULL,
    recommended      BOOLEAN       NOT NULL DEFAULT FALSE,
    reasons          VARCHAR(1000) NOT NULL,
    warnings         VARCHAR(1000) NOT NULL,
    created_at       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT chk_recommendations_kind CHECK (kind IN ('TRAIN', 'BUS', 'WAIT')),
    CONSTRAINT fk_recommendations_impact FOREIGN KEY (impact_id)
        REFERENCES journey_impacts (id),
    CONSTRAINT fk_recommendations_train FOREIGN KEY (ref_train_number)
        REFERENCES trains (number),
    CONSTRAINT fk_recommendations_bus_trip FOREIGN KEY (ref_bus_trip_id)
        REFERENCES bus_trips (id),
    CONSTRAINT fk_recommendations_from_station FOREIGN KEY (from_station)
        REFERENCES stations (code),
    CONSTRAINT fk_recommendations_to_station FOREIGN KEY (to_station)
        REFERENCES stations (code),
    KEY idx_recommendations_impact (impact_id, `rank`)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci;
