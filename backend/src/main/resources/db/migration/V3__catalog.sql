CREATE TABLE IF NOT EXISTS stations (
    code       VARCHAR(8)   NOT NULL,
    name       VARCHAR(120) NOT NULL,
    city       VARCHAR(80)  NOT NULL,
    state      VARCHAR(80)  NOT NULL,
    latitude   DECIMAL(9, 6) NOT NULL,
    longitude  DECIMAL(9, 6) NOT NULL,
    PRIMARY KEY (code)
);

CREATE TABLE IF NOT EXISTS trains (
    number           VARCHAR(8)   NOT NULL,
    name             VARCHAR(120) NOT NULL,
    type             VARCHAR(20)  NOT NULL,
    source_code      VARCHAR(8)   NOT NULL,
    destination_code VARCHAR(8)   NOT NULL,
    runs_on          VARCHAR(40)  NOT NULL,
    PRIMARY KEY (number),
    CONSTRAINT chk_trains_type CHECK (type IN
        ('RAJDHANI', 'SHATABDI', 'EXPRESS', 'SUPERFAST', 'VANDE_BHARAT', 'OTHER')),
    CONSTRAINT fk_trains_source FOREIGN KEY (source_code) REFERENCES stations (code),
    CONSTRAINT fk_trains_destination FOREIGN KEY (destination_code) REFERENCES stations (code)
);

CREATE TABLE IF NOT EXISTS train_schedule (
    id            BIGINT       NOT NULL AUTO_INCREMENT,
    train_number  VARCHAR(8)   NOT NULL,
    station_code  VARCHAR(8)   NOT NULL,
    stop_order    INT          NOT NULL,
    arrival_time  TIME         NULL,
    departure_time TIME        NULL,
    day_offset    INT          NOT NULL DEFAULT 0,
    distance_km   INT          NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    CONSTRAINT uk_train_schedule_stop UNIQUE (train_number, stop_order),
    CONSTRAINT fk_train_schedule_train FOREIGN KEY (train_number) REFERENCES trains (number),
    CONSTRAINT fk_train_schedule_station FOREIGN KEY (station_code) REFERENCES stations (code)
);

CREATE TABLE IF NOT EXISTS train_classes (
    id           BIGINT        NOT NULL AUTO_INCREMENT,
    train_number VARCHAR(8)    NOT NULL,
    class_code   VARCHAR(4)    NOT NULL,
    base_fare    DECIMAL(10, 2) NOT NULL,
    total_seats  INT           NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_train_classes_class UNIQUE (train_number, class_code),
    CONSTRAINT fk_train_classes_train FOREIGN KEY (train_number) REFERENCES trains (number)
);

CREATE TABLE IF NOT EXISTS coaches (
    id           BIGINT      NOT NULL AUTO_INCREMENT,
    train_number VARCHAR(8)  NOT NULL,
    class_code   VARCHAR(4)  NOT NULL,
    coach_no     VARCHAR(8)  NOT NULL,
    layout       VARCHAR(16) NOT NULL,
    seat_count   INT         NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_coaches_number UNIQUE (train_number, coach_no),
    CONSTRAINT chk_coaches_layout CHECK (layout IN
        ('BERTH', 'CHAIR_2x2', 'CHAIR_3x2', 'CHAIR_2x1')),
    CONSTRAINT fk_coaches_train FOREIGN KEY (train_number) REFERENCES trains (number)
);

CREATE TABLE IF NOT EXISTS seat_inventory (
    id           BIGINT      NOT NULL AUTO_INCREMENT,
    train_number VARCHAR(8)  NOT NULL,
    travel_date  DATE        NOT NULL,
    coach_id     BIGINT      NOT NULL,
    seat_no      INT         NOT NULL,
    berth_type   VARCHAR(4)  NULL,
    status       VARCHAR(12) NOT NULL,
    held_until   TIMESTAMP   NULL,
    version      BIGINT      NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    CONSTRAINT uk_seat_inventory_seat UNIQUE (train_number, travel_date, coach_id, seat_no),
    CONSTRAINT chk_seat_inventory_status CHECK (status IN ('AVAILABLE', 'OCCUPIED', 'HELD')),
    CONSTRAINT fk_seat_inventory_train FOREIGN KEY (train_number) REFERENCES trains (number),
    CONSTRAINT fk_seat_inventory_coach FOREIGN KEY (coach_id) REFERENCES coaches (id)
);

CREATE TABLE IF NOT EXISTS bus_services (
    id                BIGINT        NOT NULL AUTO_INCREMENT,
    operator          VARCHAR(80)   NOT NULL,
    bus_type          VARCHAR(20)   NOT NULL,
    from_city         VARCHAR(80)   NOT NULL,
    to_city           VARCHAR(80)   NOT NULL,
    from_station_code VARCHAR(8)    NULL,
    departure_time    TIME          NOT NULL,
    duration_minutes  INT           NOT NULL,
    base_fare         DECIMAL(10, 2) NOT NULL,
    total_seats       INT           NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_bus_services_service UNIQUE (operator, from_city, to_city, departure_time),
    CONSTRAINT chk_bus_services_type CHECK (bus_type IN
        ('AC_SLEEPER', 'AC_SEATER', 'NON_AC_SEATER', 'VOLVO_MULTIAXLE')),
    CONSTRAINT fk_bus_services_station FOREIGN KEY (from_station_code) REFERENCES stations (code)
);

CREATE TABLE IF NOT EXISTS bus_trips (
    id             BIGINT NOT NULL AUTO_INCREMENT,
    bus_service_id BIGINT NOT NULL,
    travel_date    DATE   NOT NULL,
    seats_left     INT    NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_bus_trips_trip UNIQUE (bus_service_id, travel_date),
    CONSTRAINT fk_bus_trips_service FOREIGN KEY (bus_service_id) REFERENCES bus_services (id)
);

CREATE TABLE IF NOT EXISTS hotels (
    id           BIGINT         NOT NULL AUTO_INCREMENT,
    name         VARCHAR(120)   NOT NULL,
    station_code VARCHAR(8)     NOT NULL,
    address      VARCHAR(255)   NOT NULL,
    distance_km  DECIMAL(4, 1)  NOT NULL,
    price_min    DECIMAL(10, 2) NOT NULL,
    price_max    DECIMAL(10, 2) NOT NULL,
    rating       DECIMAL(2, 1)  NOT NULL,
    phone        VARCHAR(20)    NOT NULL,
    email        VARCHAR(120)   NOT NULL,
    map_url      VARCHAR(255)   NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_hotels_name UNIQUE (name, station_code),
    CONSTRAINT fk_hotels_station FOREIGN KEY (station_code) REFERENCES stations (code)
);

CREATE TABLE IF NOT EXISTS hotel_policies (
    hotel_id                 BIGINT        NOT NULL,
    standard_checkin_time    TIME          NOT NULL,
    standard_checkout_time   TIME          NOT NULL,
    late_arrival_allowed     BOOLEAN       NOT NULL,
    late_arrival_cutoff      TIME          NULL,
    late_checkout_allowed    BOOLEAN       NOT NULL,
    max_late_checkout_time   TIME          NULL,
    late_checkout_fee_type   VARCHAR(12)   NOT NULL,
    late_checkout_fee_amount DECIMAL(10, 2) NOT NULL,
    extra_night_possible     BOOLEAN       NOT NULL,
    free_change_window_hours INT           NOT NULL,
    extension_needs_approval VARCHAR(12)   NOT NULL,
    PRIMARY KEY (hotel_id),
    CONSTRAINT chk_hotel_policies_fee CHECK (late_checkout_fee_type IN
        ('FREE', 'HOURLY', 'FLAT', 'HALF_DAY')),
    CONSTRAINT chk_hotel_policies_approval CHECK (extension_needs_approval IN ('AUTO', 'ON_REQUEST')),
    CONSTRAINT fk_hotel_policies_hotel FOREIGN KEY (hotel_id) REFERENCES hotels (id)
);

CREATE TABLE IF NOT EXISTS hotel_rooms (
    id              BIGINT         NOT NULL AUTO_INCREMENT,
    hotel_id        BIGINT         NOT NULL,
    floor           INT            NOT NULL,
    room_no         VARCHAR(8)     NOT NULL,
    room_type       VARCHAR(12)    NOT NULL,
    capacity        INT            NOT NULL,
    price_per_night DECIMAL(10, 2) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_hotel_rooms_room UNIQUE (hotel_id, room_no),
    CONSTRAINT chk_hotel_rooms_type CHECK (room_type IN ('STANDARD', 'DELUXE', 'SUITE')),
    CONSTRAINT fk_hotel_rooms_hotel FOREIGN KEY (hotel_id) REFERENCES hotels (id)
);

CREATE TABLE IF NOT EXISTS room_availability (
    id         BIGINT      NOT NULL AUTO_INCREMENT,
    room_id    BIGINT      NOT NULL,
    stay_date  DATE        NOT NULL,
    status     VARCHAR(12) NOT NULL,
    held_until TIMESTAMP   NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_room_availability_night UNIQUE (room_id, stay_date),
    CONSTRAINT chk_room_availability_status CHECK (status IN ('AVAILABLE', 'BOOKED', 'HELD')),
    CONSTRAINT fk_room_availability_room FOREIGN KEY (room_id) REFERENCES hotel_rooms (id)
);

CREATE TABLE IF NOT EXISTS settings (
    setting_key   VARCHAR(60)  NOT NULL,
    setting_value VARCHAR(120) NOT NULL,
    description   VARCHAR(255) NOT NULL,
    PRIMARY KEY (setting_key)
);

CREATE INDEX idx_train_schedule_station_departure ON train_schedule (station_code, departure_time);
CREATE INDEX idx_seat_inventory_train_date_status ON seat_inventory (train_number, travel_date, status);
