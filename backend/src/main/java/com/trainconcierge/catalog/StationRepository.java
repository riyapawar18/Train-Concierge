package com.trainconcierge.catalog;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface StationRepository extends JpaRepository<Station, String> {

    @Query("""
            select s from Station s
            where lower(s.code) like lower(concat('%', :query, '%'))
               or lower(s.name) like lower(concat('%', :query, '%'))
               or lower(s.city) like lower(concat('%', :query, '%'))
            order by case
                         when lower(s.code) = lower(:query) then 0
                         when lower(s.name) = lower(:query) then 1
                         else 2
                     end,
                     s.name
            """)
    List<Station> search(@Param("query") String query, Pageable pageable);
}
