package com.trainconcierge.hotel;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface RoomAvailabilityRepository extends JpaRepository<RoomAvailability, Long> {
    List<RoomAvailability> findByRoomIdAndStayDateBetween(Long roomId, LocalDate from, LocalDate to);
    Optional<RoomAvailability> findByRoomIdAndStayDate(Long roomId, LocalDate date);

    @Query("SELECT ra FROM RoomAvailability ra WHERE ra.roomId IN :roomIds AND ra.stayDate BETWEEN :from AND :to")
    List<RoomAvailability> findByRoomIdsAndDateRange(List<Long> roomIds, LocalDate from, LocalDate to);

    @Modifying
    @Query("UPDATE RoomAvailability ra SET ra.status='AVAILABLE', ra.heldUntil=NULL WHERE ra.status='HELD' AND ra.heldUntil < :now")
    int releaseExpiredHolds(LocalDateTime now);

    @Query("SELECT ra FROM RoomAvailability ra WHERE ra.roomId IN :roomIds AND ra.stayDate = :date AND ra.status = 'AVAILABLE'")
    List<RoomAvailability> findAvailableByRoomIdsAndDate(List<Long> roomIds, LocalDate date);
}
