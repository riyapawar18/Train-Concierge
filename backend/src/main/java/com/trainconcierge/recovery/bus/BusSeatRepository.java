package com.trainconcierge.recovery.bus;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BusSeatRepository extends JpaRepository<BusSeat, Long> {
    List<BusSeat> findByBusTripIdAndStatus(Long busTripId, String status);
    BusSeat findByBusTripIdAndSeatCode(Long busTripId, String seatCode);
}
