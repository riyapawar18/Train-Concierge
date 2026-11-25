package com.trainconcierge.recovery.bus;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Service
public class BusSeatService {

    private final BusSeatRepository busSeatRepository;
    private final BusHoldRepository busHoldRepository;

    @Autowired
    public BusSeatService(BusSeatRepository busSeatRepository, BusHoldRepository busHoldRepository) {
        this.busSeatRepository = busSeatRepository;
        this.busHoldRepository = busHoldRepository;
    }

    /**
     * Returns all FREE seats for the given bus trip.
     */
    @Transactional(readOnly = true)
    public List<BusSeat> findAvailableSeats(Long busTripId) {
        return busSeatRepository.findByBusTripIdAndStatus(busTripId, "FREE");
    }

    /**
     * Places a temporary hold on a seat for the given user.
     * The hold expires after 5 minutes.
     */
    @Transactional
    public void holdSeat(Long seatId, Long userId) {
        BusSeat seat = busSeatRepository.findById(seatId)
                .orElseThrow(() -> new RuntimeException("Bus seat not found"));
        if (!"FREE".equals(seat.getStatus())) {
            throw new RuntimeException("Seat is not free for hold");
        }
        LocalDateTime expiresAt = LocalDateTime.now().plus(5, ChronoUnit.MINUTES);
        seat.setStatus("HELD");
        seat.setHeldBy(userId);
        seat.setHeldUntil(expiresAt);
        busSeatRepository.save(seat);
        BusHold hold = new BusHold();
        hold.setUserId(userId);
        hold.setBusSeatId(seatId);
        hold.setExpiresAt(expiresAt);
        busHoldRepository.save(hold);
    }

    /**
     * Releases a hold (by hold ID) before it expires.
     */
    @Transactional
    public void releaseHold(Long holdId) {
        BusHold hold = busHoldRepository.findById(holdId)
                .orElseThrow(() -> new RuntimeException("Bus hold not found"));
        BusSeat seat = busSeatRepository.findById(hold.getBusSeatId())
                .orElseThrow(() -> new RuntimeException("Associated bus seat not found"));
        seat.setStatus("FREE");
        seat.setHeldBy(null);
        seat.setHeldUntil(null);
        busSeatRepository.save(seat);
        busHoldRepository.delete(hold);
    }

    /**
     * Cleanup task that removes expired holds and frees the seats.
     */
    @Transactional
    public void cleanExpiredHolds() {
        List<BusHold> expired = busHoldRepository.findAll().stream()
                .filter(h -> h.getExpiresAt().isBefore(LocalDateTime.now()))
                .toList();
        for (BusHold hold : expired) {
            BusSeat seat = busSeatRepository.findById(hold.getBusSeatId())
                    .orElse(null);
            if (seat != null && "HELD".equals(seat.getStatus())) {
                seat.setStatus("FREE");
                seat.setHeldBy(null);
                seat.setHeldUntil(null);
                busSeatRepository.save(seat);
            }
            busHoldRepository.delete(hold);
        }
    }
}
