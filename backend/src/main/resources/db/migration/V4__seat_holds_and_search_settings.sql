ALTER TABLE seat_inventory
    ADD COLUMN held_by BIGINT NULL;

ALTER TABLE seat_inventory
    ADD CONSTRAINT fk_seat_inventory_held_by FOREIGN KEY (held_by) REFERENCES users (id);

CREATE INDEX idx_seat_inventory_held_by ON seat_inventory (held_by, status);

INSERT INTO settings (setting_key, setting_value, description)
SELECT 'seat_alert_threshold', '20', 'Available seats above this value show as plenty'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM settings WHERE setting_key = 'seat_alert_threshold');

INSERT INTO settings (setting_key, setting_value, description)
SELECT 'seat_very_low_threshold', '5', 'Available seats at or below this value show as very low'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM settings WHERE setting_key = 'seat_very_low_threshold');

INSERT INTO settings (setting_key, setting_value, description)
SELECT 'seat_hold_minutes', '10', 'Minutes a selected seat stays held before release'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM settings WHERE setting_key = 'seat_hold_minutes');

INSERT INTO settings (setting_key, setting_value, description)
SELECT 'station_group_radius_km', '60', 'Stations within this radius form a search area'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM settings WHERE setting_key = 'station_group_radius_km');
