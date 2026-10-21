package com.trainconcierge.repository;

import com.trainconcierge.entity.Station;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface StationRepository extends JpaRepository<Station, Long> {

    Optional<Station> findByStationCodeIgnoreCase(String code);

    boolean existsByStationCodeIgnoreCase(String code);

    /** Search by code OR name (partial, case-insensitive). Useful for autocomplete. */
    @Query("""
            SELECT s FROM Station s
            WHERE UPPER(s.stationCode) = UPPER(:query)
               OR UPPER(s.stationName) LIKE UPPER(CONCAT('%', :query, '%'))
               OR UPPER(s.alternateName) LIKE UPPER(CONCAT('%', :query, '%'))
            ORDER BY
              CASE WHEN UPPER(s.stationCode) = UPPER(:query) THEN 0 ELSE 1 END,
              s.stationName
            """)
    List<Station> findByCodeOrNameContaining(@Param("query") String query);

    long countByDataSource(String dataSource);
}
