package com.trainconcierge.catalog;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface BusTripRepository extends JpaRepository<BusTrip, Long> {

    @Query("""
            select t from BusTrip t join fetch t.service s
            where t.travelDate in :dates
              and lower(s.fromCity) = lower(:fromCity)
              and lower(s.toCity) = lower(:toCity)
            order by t.travelDate, s.departureTime, t.id
            """)
    List<BusTrip> findTrips(@Param("fromCity") String fromCity,
                            @Param("toCity") String toCity,
                            @Param("dates") Collection<LocalDate> dates);

    @Query("select t from BusTrip t join fetch t.service where t.id = :id")
    Optional<BusTrip> findWithService(@Param("id") Long id);
}
