package com.trainconcierge.notification;

import com.trainconcierge.common.security.CurrentUser;
import com.trainconcierge.notification.dto.MarkAllReadResponse;
import com.trainconcierge.notification.dto.NotificationPageResponse;
import com.trainconcierge.notification.dto.NotificationResponse;
import com.trainconcierge.notification.dto.UnreadCountResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationQueryService notificationQueryService;

    public NotificationController(NotificationQueryService notificationQueryService) {
        this.notificationQueryService = notificationQueryService;
    }

    @GetMapping
    public NotificationPageResponse list(
            @RequestParam(required = false) String filter,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return notificationQueryService.list(CurrentUser.id(), filter, page, size);
    }

    @GetMapping("/unread-count")
    public UnreadCountResponse unreadCount() {
        return new UnreadCountResponse(notificationQueryService.unreadCount(CurrentUser.id()));
    }

    @PatchMapping("/{id}/read")
    public NotificationResponse markRead(@PathVariable Long id) {
        return notificationQueryService.markRead(id, CurrentUser.id());
    }

    @PostMapping("/read-all")
    public MarkAllReadResponse markAllRead() {
        return new MarkAllReadResponse(notificationQueryService.markAllRead(CurrentUser.id()));
    }
}
