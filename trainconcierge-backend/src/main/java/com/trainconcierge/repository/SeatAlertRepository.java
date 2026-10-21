package com.trainconcierge.repository;

import com.trainconcierge.entity.SeatAlert;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface SeatAlertRepository extends JpaRepository<SeatAlert, Long> {
    List<SeatAlert> findByUserIdOrderByCreatedAtDesc(Long userId);

    @Query("SELECT sa FROM SeatAlert sa WHERE sa.status = 'ACTIVE' AND sa.fromStation = :from AND sa.toStation = :to AND sa.travelDate = :date AND sa.seatsRequired <= :available")
    List<SeatAlert> findTriggerable(
            @Param("from") String from,
            @Param("to") String to,
            @Param("date") LocalDate date,
            @Param("available") int available);
}
