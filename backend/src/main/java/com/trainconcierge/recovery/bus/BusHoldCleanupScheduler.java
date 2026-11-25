package com.trainconcierge.recovery.bus;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Scheduler that runs every 5 minutes to clean up expired bus holds.
 */
@Component
public class BusHoldCleanupScheduler {

    private final BusSeatService busSeatService;

    public BusHoldCleanupScheduler(BusSeatService busSeatService) {
        this.busSeatService = busSeatService;
    }

    // Runs every 5 minutes (6-field cron: second minute hour day-of-month month day-of-week)
    @Scheduled(cron = "0 */5 * * * *")
    public void cleanupExpiredHolds() {
        busSeatService.cleanExpiredHolds();
    }
}
