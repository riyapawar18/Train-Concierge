package com.trainconcierge.notification;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class MailRetryJob {

    private static final Logger log = LoggerFactory.getLogger(MailRetryJob.class);

    private final NotificationRepository notificationRepository;
    private final MailService mailService;

    public MailRetryJob(NotificationRepository notificationRepository, MailService mailService) {
        this.notificationRepository = notificationRepository;
        this.mailService = mailService;
    }

    @Scheduled(fixedDelayString = "${app.mail.retry-delay-ms:60000}",
            initialDelayString = "${app.mail.retry-initial-delay-ms:60000}")
    public void retryFailed() {
        if (!mailService.isConfigured()) {
            return;
        }
        List<Notification> failed = notificationRepository
                .findTop20ByChannelAndDeliveryStatusAndAttemptsLessThanOrderByCreatedAtAscIdAsc(
                        NotificationChannel.EMAIL, DeliveryStatus.FAILED, MailService.MAX_ATTEMPTS);
        for (Notification notification : failed) {
            mailService.deliver(notification.getId());
        }
        if (!failed.isEmpty()) {
            log.info("Retried {} failed email notification(s).", failed.size());
        }
    }
}
