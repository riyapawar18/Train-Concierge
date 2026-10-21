package com.trainconcierge.repository;

import com.trainconcierge.entity.DataSyncLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DataSyncLogRepository extends JpaRepository<DataSyncLog, Long> {

    List<DataSyncLog> findTop10ByOrderByStartedAtDesc();

    Optional<DataSyncLog> findTopByDataSourceAndStatusOrderByStartedAtDesc(
            String dataSource, String status);

    boolean existsByDataSourceAndStatus(String dataSource, String status);
}
