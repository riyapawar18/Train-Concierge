package com.trainconcierge.notification;

import com.trainconcierge.common.error.ApiException;
import com.trainconcierge.notification.dto.NotificationPageResponse;
import com.trainconcierge.notification.dto.NotificationResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class NotificationQueryService {

    private static final int MAX_PAGE_SIZE = 50;

    private final NotificationRepository notificationRepository;

    public NotificationQueryService(NotificationRepository notificationRepository) {
        this.notificationRepository = notificationRepository;
    }

    @Transactional(readOnly = true)
    public NotificationPageResponse list(Long userId, String filterParam, int page, int size) {
        NotificationFilter filter = NotificationFilter.parse(filterParam);
        Pageable pageable = PageRequest.of(Math.max(0, page),
                Math.min(MAX_PAGE_SIZE, Math.max(1, size)));
        List<NotificationType> types = filter.getTypes();
        Page<Notification> result;
        if (types == null) {
            result = filter.isUnreadOnly()
                    ? notificationRepository
                    .findByUserIdAndChannelAndReadAtIsNullOrderByCreatedAtDescIdDesc(
                            userId, NotificationChannel.IN_APP, pageable)
                    : notificationRepository.findByUserIdAndChannelOrderByCreatedAtDescIdDesc(
                    userId, NotificationChannel.IN_APP, pageable);
        } else {
            result = filter.isUnreadOnly()
                    ? notificationRepository
                    .findByUserIdAndChannelAndReadAtIsNullAndTypeInOrderByCreatedAtDescIdDesc(
                            userId, NotificationChannel.IN_APP, types, pageable)
                    : notificationRepository
                    .findByUserIdAndChannelAndTypeInOrderByCreatedAtDescIdDesc(
                            userId, NotificationChannel.IN_APP, types, pageable);
        }
        return new NotificationPageResponse(
                result.getContent().stream().map(NotificationQueryService::toResponse).toList(),
                result.getNumber(),
                result.getSize(),
                result.getTotalElements(),
                result.hasNext());
    }

    @Transactional(readOnly = true)
    public long unreadCount(Long userId) {
        return notificationRepository.countByUserIdAndChannelAndReadAtIsNull(
                userId, NotificationChannel.IN_APP);
    }

    @Transactional
    public NotificationResponse markRead(Long notificationId, Long userId) {
        Notification notification = notificationRepository
                .findByIdAndUserIdAndChannel(notificationId, userId, NotificationChannel.IN_APP)
                .orElseThrow(ApiException::notFound);
        notification.markRead(LocalDateTime.now());
        return toResponse(notificationRepository.save(notification));
    }

    @Transactional
    public int markAllRead(Long userId) {
        return notificationRepository.markAllRead(userId, NotificationChannel.IN_APP,
                LocalDateTime.now());
    }

    private static NotificationResponse toResponse(Notification notification) {
        return new NotificationResponse(
                notification.getId(),
                notification.getType().name(),
                notification.getTitle(),
                notification.getBody(),
                notification.getLinkPath(),
                notification.getEntityType(),
                notification.getEntityId(),
                notification.isRead(),
                notification.getCreatedAt());
    }
}
