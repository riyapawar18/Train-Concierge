package com.trainconcierge.notification;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    Page<Notification> findByUserIdAndChannelOrderByCreatedAtDescIdDesc(
            Long userId, NotificationChannel channel, Pageable pageable);

    Page<Notification> findByUserIdAndChannelAndReadAtIsNullOrderByCreatedAtDescIdDesc(
            Long userId, NotificationChannel channel, Pageable pageable);

    Page<Notification> findByUserIdAndChannelAndTypeInOrderByCreatedAtDescIdDesc(
            Long userId, NotificationChannel channel, Collection<NotificationType> types,
            Pageable pageable);

    Page<Notification> findByUserIdAndChannelAndReadAtIsNullAndTypeInOrderByCreatedAtDescIdDesc(
            Long userId, NotificationChannel channel, Collection<NotificationType> types,
            Pageable pageable);

    long countByUserIdAndChannelAndReadAtIsNull(Long userId, NotificationChannel channel);

    Optional<Notification> findByIdAndUserIdAndChannel(Long id, Long userId,
                                                      NotificationChannel channel);

    List<Notification> findTop5ByUserIdAndChannelOrderByCreatedAtDescIdDesc(
            Long userId, NotificationChannel channel);

    List<Notification> findTop20ByChannelAndDeliveryStatusAndAttemptsLessThanOrderByCreatedAtAscIdAsc(
            NotificationChannel channel, DeliveryStatus status, int maxAttempts);

    @org.springframework.data.jpa.repository.Modifying
    @Query("update Notification n set n.readAt = :readAt "
            + "where n.userId = :userId and n.channel = :channel and n.readAt is null")
    int markAllRead(@Param("userId") Long userId, @Param("channel") NotificationChannel channel,
                    @Param("readAt") java.time.LocalDateTime readAt);

    List<Notification> findByUserIdAndChannelAndEntityTypeAndEntityId(
            Long userId, NotificationChannel channel, String entityType, Long entityId);

    @Query("SELECT COUNT(n) FROM Notification n WHERE n.deliveryStatus = 'SENT' AND n.createdAt >= :since")
    long countSentSince(@Param("since") java.time.LocalDateTime since);

    @Query("""
        SELECT n FROM Notification n
        WHERE (:channel IS NULL OR CAST(n.channel AS string) = :channel)
          AND (:status IS NULL OR CAST(n.deliveryStatus AS string) = :status)
        ORDER BY n.createdAt DESC
        """)
    org.springframework.data.domain.Page<Notification> findAllAdmin(
            @Param("channel") String channel,
            @Param("status") String status,
            org.springframework.data.domain.Pageable pageable);

    @Query(value = """
        SELECT CAST(n.created_at AS DATE) AS date,
               SUM(CASE WHEN n.delivery_status='SENT' THEN 1 ELSE 0 END) AS sent,
               SUM(CASE WHEN n.delivery_status='FAILED' THEN 1 ELSE 0 END) AS failed,
               CONCAT(ROUND(100.0*SUM(CASE WHEN n.delivery_status='SENT' THEN 1 ELSE 0 END)
                   /GREATEST(COUNT(*),1),1),'%') AS rate
        FROM notifications n WHERE n.channel='EMAIL'
          AND CAST(n.created_at AS DATE) BETWEEN :from AND :to
        GROUP BY CAST(n.created_at AS DATE) ORDER BY 1
        """, nativeQuery = true)
    List<java.util.Map<String, Object>> deliveryStats(
            @Param("from") java.time.LocalDate from,
            @Param("to") java.time.LocalDate to);
}
