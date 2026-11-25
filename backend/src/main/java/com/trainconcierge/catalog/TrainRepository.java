package com.trainconcierge.catalog;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface TrainRepository extends JpaRepository<Train, String> {

    Optional<Train> findByNumber(String number);

    @Query("""
            select t from Train t
            where lower(t.number) like lower(concat('%', :query, '%'))
               or lower(t.name) like lower(concat('%', :query, '%'))
            order by t.number
            """)
    List<Train> search(@Param("query") String query, Pageable pageable);
}
