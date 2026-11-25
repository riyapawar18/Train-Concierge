package com.trainconcierge.notification;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.LocalDateTime;

@Entity
@Table(name = "notifications")
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private NotificationType type;

    @Column(nullable = false, length = 190)
    private String title;

    @Column(nullable = false, length = 1000)
    private String body;

    @Column(name = "link_path", length = 255)
    private String linkPath;

    @Column(name = "entity_type", length = 40)
    private String entityType;

    @Column(name = "entity_id")
    private Long entityId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private NotificationChannel channel;

    @Enumerated(EnumType.STRING)
    @Column(name = "delivery_status", nullable = false, length = 20)
    private DeliveryStatus deliveryStatus;

    @Column(name = "delivery_error", length = 300)
    private String deliveryError;

    @Column(nullable = false)
    private int attempts;

    @Column(name = "read_at")
    private LocalDateTime readAt;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "sent_at")
    private LocalDateTime sentAt;

    protected Notification() {
    }

    public static Notification create(Long userId, NotificationType type, String title, String body,
                                      String linkPath, String entityType, Long entityId,
                                      NotificationChannel channel, LocalDateTime createdAt) {
        Notification notification = new Notification();
        notification.userId = userId;
        notification.type = type;
        notification.title = title;
        notification.body = body;
        notification.linkPath = linkPath;
        notification.entityType = entityType;
        notification.entityId = entityId;
        notification.channel = channel;
        notification.deliveryStatus = DeliveryStatus.PENDING;
        notification.createdAt = createdAt;
        return notification;
    }

    public void recordAttempt() {
        attempts++;
    }

    public void markSent(LocalDateTime at) {
        this.deliveryStatus = DeliveryStatus.SENT;
        this.deliveryError = null;
        this.sentAt = at;
    }

    public void markFailed(String error) {
        this.deliveryStatus = DeliveryStatus.FAILED;
        this.deliveryError = error;
    }

    public void markRead(LocalDateTime at) {
        if (readAt == null) {
            readAt = at;
        }
    }

    public boolean isRead() {
        return readAt != null;
    }

    public Long getId() {
        return id;
    }

    public Long getUserId() {
        return userId;
    }

    public NotificationType getType() {
        return type;
    }

    public String getTitle() {
        return title;
    }

    public String getBody() {
        return body;
    }

    public String getLinkPath() {
        return linkPath;
    }

    public String getEntityType() {
        return entityType;
    }

    public Long getEntityId() {
        return entityId;
    }

    public NotificationChannel getChannel() {
        return channel;
    }

    public DeliveryStatus getDeliveryStatus() {
        return deliveryStatus;
    }

    public String getDeliveryError() {
        return deliveryError;
    }

    public int getAttempts() {
        return attempts;
    }

    public LocalDateTime getReadAt() {
        return readAt;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getSentAt() {
        return sentAt;
    }
}
