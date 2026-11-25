package com.trainconcierge.travel;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SettingsService {

    private final SettingRepository settingRepository;

    public SettingsService(SettingRepository settingRepository) {
        this.settingRepository = settingRepository;
    }

    @Transactional(readOnly = true)
    public int seatHoldMinutes() {
        return intValue("seat_hold_minutes", 10);
    }

    @Transactional(readOnly = true)
    public int plentyThreshold() {
        return intValue("seat_alert_threshold", 20);
    }

    @Transactional(readOnly = true)
    public int veryLowThreshold() {
        return intValue("seat_very_low_threshold", 5);
    }

    @Transactional(readOnly = true)
    public int stationGroupRadiusKm() {
        return intValue("station_group_radius_km", 60);
    }

    private int intValue(String key, int fallback) {
        return settingRepository.findById(key)
                .map(Setting::getValue)
                .map(value -> {
                    try {
                        return Integer.parseInt(value.trim());
                    } catch (NumberFormatException ex) {
                        return fallback;
                    }
                })
                .orElse(fallback);
    }
}
