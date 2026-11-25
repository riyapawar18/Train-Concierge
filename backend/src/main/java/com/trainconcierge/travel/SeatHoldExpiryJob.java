package com.trainconcierge.travel;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class SeatHoldExpiryJob {

    private static final Logger log = LoggerFactory.getLogger(SeatHoldExpiryJob.class);

    private final SeatInventoryService seatInventoryService;

    public SeatHoldExpiryJob(SeatInventoryService seatInventoryService) {
        this.seatInventoryService = seatInventoryService;
    }

    @Scheduled(fixedDelayString = "${app.seats.expiry-check-ms:60000}",
            initialDelayString = "${app.seats.expiry-initial-delay-ms:60000}")
    public void releaseExpiredHolds() {
        int released = seatInventoryService.releaseAllExpired();
        if (released > 0) {
            log.info("Released {} expired seat holds.", released);
        }
    }
}
