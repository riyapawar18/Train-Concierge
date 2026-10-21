package com.trainconcierge.repository;

import com.trainconcierge.entity.Train;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface TrainRepository extends JpaRepository<Train, Long> {

    Optional<Train> findByTrainNumber(String trainNumber);

    List<Train> findByFromStationIgnoreCaseAndToStationIgnoreCaseAndTravelDate(
            String fromStation, String toStation, LocalDate travelDate);

    @Query("SELECT t FROM Train t WHERE t.fromStation LIKE %:station% OR t.toStation LIKE %:station%")
    List<Train> findByStation(@Param("station") String station);

    List<Train> findByStatus(Train.TrainStatus status);

    @Query("SELECT t FROM Train t WHERE t.fromStation LIKE %:from% AND t.toStation LIKE %:to% AND t.travelDate >= :date AND t.availableSeats >= :seats AND t.status != 'CANCELLED'")
    List<Train> searchAvailableTrains(
            @Param("from") String fromStation,
            @Param("to") String toStation,
            @Param("date") LocalDate date,
            @Param("seats") int seats);
}
