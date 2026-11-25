package com.trainconcierge.notification;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.Optional;

public interface SeatAlertLogRepository extends JpaRepository<SeatAlertLog, Long> {

    Optional<SeatAlertLog> findByUserIdAndTrainNumberAndTravelDate(Long userId, String trainNumber,
                                                                   LocalDate travelDate);
}
