-- Phase 14: additional indexes confirmed by EXPLAIN on the most frequent queries.
--
-- MySQL has no CREATE INDEX ... IF NOT EXISTS, and Flyway guarantees each migration runs
-- exactly once, so the guards the first revision used are dropped rather than replaced.

-- Booking search by train + date is already indexed via idx_bookings_pnr.
-- Adding status to the booking index for the availability query.
CREATE INDEX idx_bookings_train_date_status
    ON bookings (train_number, travel_date, status);

-- Journey status filter (admin journey list, stats count).
-- The column is journeys.status; stored_status is the Java field name, not a column.
CREATE INDEX idx_journeys_status
    ON journeys (status, created_at);

-- Notification delivery retry and feed query.
CREATE INDEX idx_notifications_status_channel
    ON notifications (channel, delivery_status, created_at);

-- Hotel booking user + status query.
CREATE INDEX idx_hotel_bookings_status
    ON hotel_bookings (user_id, status, created_at);

-- Hotel impact lookup by booking is already indexed: V9 declares
-- KEY idx_hotel_impacts_booking on hotel_impacts (hotel_booking_id) inline.

-- Disruption date range for reports.
CREATE INDEX idx_disruptions_travel_date
    ON disruptions (travel_date, status);

-- Journey impact disruption status for stats.
CREATE INDEX idx_journey_impacts_disruption_status
    ON journey_impacts (disruption_id);

-- Audit log actor.
CREATE INDEX idx_audit_log_actor
    ON audit_log (actor_user_id, created_at);
