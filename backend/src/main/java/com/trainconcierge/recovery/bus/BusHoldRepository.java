package com.trainconcierge.recovery.bus;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface BusHoldRepository extends JpaRepository<BusHold, Long> {
    Optional<BusHold> findByBusSeatIdAndUserId(Long busSeatId, Long userId);
}
