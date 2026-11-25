package com.trainconcierge.notification;

import com.trainconcierge.user.User;
import com.trainconcierge.user.UserRepository;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.mail.MailAuthenticationException;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;
import org.thymeleaf.spring6.SpringTemplateEngine;
import org.thymeleaf.templatemode.TemplateMode;
import org.thymeleaf.templateresolver.ClassLoaderTemplateResolver;

import java.io.UnsupportedEncodingException;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicBoolean;

@Service
public class MailService {

    public static final int MAX_ATTEMPTS = 3;
    static final String NOT_CONFIGURED_MESSAGE = "Email not configured";

    private static final Logger log = LoggerFactory.getLogger(MailService.class);

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final ObjectProvider<JavaMailSender> mailSenderProvider;
    private final EmailDetailsFactory detailsFactory;
    private final TemplateEngine htmlTemplates;
    private final TemplateEngine textTemplates;
    private final boolean enabled;
    private final String host;
    private final int port;
    private final String username;
    private final String from;
    private final String frontendOrigin;
    private final AtomicBoolean warned = new AtomicBoolean();

    public MailService(NotificationRepository notificationRepository,
                       UserRepository userRepository,
                       ObjectProvider<JavaMailSender> mailSenderProvider,
                       EmailDetailsFactory detailsFactory,
                       @Value("${app.mail.enabled:true}") boolean enabled,
                       @Value("${spring.mail.host:}") String host,
                       @Value("${spring.mail.port:587}") int port,
                       @Value("${spring.mail.username:}") String username,
                       @Value("${app.mail.from:}") String from,
                       @Value("${app.frontend-origin:http://localhost:5173}") String frontendOrigin) {
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
        this.mailSenderProvider = mailSenderProvider;
        this.detailsFactory = detailsFactory;
        this.htmlTemplates = templateEngine(TemplateMode.HTML, ".html");
        this.textTemplates = templateEngine(TemplateMode.TEXT, ".txt");
        this.enabled = enabled;
        this.host = host;
        this.port = port;
        this.username = username;
        this.from = from;
        this.frontendOrigin = stripTrailingSlash(frontendOrigin);
    }

    /**
     * Reports how email delivery resolved at startup without touching the password. Gmail needs an
     * App Password in {@code MAIL_PASSWORD}; leaving it unset only ever marks rows as unsent.
     */
    @EventListener(ApplicationReadyEvent.class)
    public void logDeliverySetup() {
        if (!enabled) {
            log.info("Email delivery is disabled (MAIL_ENABLED=false).");
            return;
        }
        String sender = senderAddress();
        log.info("Email delivery: host={} port={} username={} from={} configured={}", host, port,
                username == null || username.isBlank() ? "(unset)" : username,
                sender == null ? "(unset)" : sender, isConfigured());
        if (!isConfigured()) {
            log.warn("Set MAIL_USERNAME and MAIL_PASSWORD (a Gmail App Password) to send email.");
        }
    }

    @Async("mailExecutor")
    public void sendAsync(Long notificationId) {
        deliver(notificationId);
    }

    public void deliver(Long notificationId) {
        Notification notification = notificationRepository.findById(notificationId).orElse(null);
        if (notification == null || notification.getChannel() != NotificationChannel.EMAIL
                || notification.getDeliveryStatus() == DeliveryStatus.SENT) {
            return;
        }
        User user = userRepository.findById(notification.getUserId()).orElse(null);
        if (user == null || !hasAddress(user)) {
            notification.markFailed("The recipient could not be found.");
            notificationRepository.save(notification);
            return;
        }
        if (!isConfigured()) {
            notification.markFailed(NOT_CONFIGURED_MESSAGE);
            notificationRepository.save(notification);
            warnOnce();
            return;
        }
        JavaMailSender sender = mailSenderProvider.getIfAvailable();
        if (sender == null) {
            notification.markFailed(NOT_CONFIGURED_MESSAGE);
            notificationRepository.save(notification);
            warnOnce();
            return;
        }

        notification.recordAttempt();
        try {
            MimeMessage message = compose(sender, user.getEmail(), notification.getTitle(),
                    templateFor(notification.getType()), variables(notification, user));
            sender.send(message);
            notification.markSent(LocalDateTime.now());
            log.info("Mail server {}:{} accepted notification {} for {}", host, port,
                    notification.getId(), user.getEmail());
        } catch (Exception ex) {
            notification.markFailed(safeError(ex));
            log.warn("Email delivery failed for notification {} (attempt {}): {}",
                    notification.getId(), notification.getAttempts(), describe(ex));
        }
        notificationRepository.save(notification);
    }

    /**
     * Sends a message that has no Notification row behind it, such as a password-reset link. The
     * caller needs the server's answer before it can tell the user to check an inbox, so this sends
     * synchronously and returns the failure reason instead of storing one.
     */
    public Optional<String> sendOne(String recipient, String subject, String template,
                                    Map<String, Object> variables) {
        if (!isConfigured()) {
            warnOnce();
            return Optional.of(NOT_CONFIGURED_MESSAGE);
        }
        JavaMailSender sender = mailSenderProvider.getIfAvailable();
        if (sender == null) {
            warnOnce();
            return Optional.of(NOT_CONFIGURED_MESSAGE);
        }
        if (recipient == null || !recipient.contains("@")) {
            return Optional.of("The recipient could not be found.");
        }
        try {
            MimeMessage message = compose(sender, recipient, subject, template, variables);
            sender.send(message);
            log.info("Mail server {}:{} accepted the '{}' message for {}", host, port, template, recipient);
            return Optional.empty();
        } catch (Exception ex) {
            log.warn("Email delivery failed for the '{}' message to {}: {}", template, recipient,
                    describe(ex));
            return Optional.of(safeError(ex));
        }
    }

    private MimeMessage compose(JavaMailSender sender, String recipient, String subject,
                                String template, Map<String, Object> variables)
            throws MessagingException, UnsupportedEncodingException {
        MimeMessage message = sender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, true,
                StandardCharsets.UTF_8.name());
        helper.setFrom(senderAddress(), "TrainConcierge");
        helper.setTo(recipient);
        helper.setSubject(subject);
        Context context = new Context(Locale.ENGLISH, variables);
        helper.setText(textTemplates.process(template, context),
                htmlTemplates.process(template, context));
        return message;
    }

    public boolean isConfigured() {
        String sender = senderAddress();
        return enabled && host != null && !host.isBlank() && sender != null && sender.contains("@");
    }

    /** Gmail rejects a {@code From} it does not own, so an unset MAIL_FROM sends from the login. */
    private String senderAddress() {
        if (from != null && from.contains("@")) {
            return from;
        }
        return username != null && username.contains("@") ? username : from;
    }

    private void warnOnce() {
        if (warned.compareAndSet(false, true)) {
            log.warn("Email delivery is not configured. Notifications stay in the app and "
                    + "email rows are marked as failed.");
        }
    }

    private boolean hasAddress(User user) {
        return user.getEmail() != null && user.getEmail().contains("@");
    }

    private Map<String, Object> variables(Notification notification, User user) {
        Map<String, Object> variables = new HashMap<>();
        variables.put("recipientName", user.getFullName());
        variables.put("title", notification.getTitle());
        variables.put("body", notification.getBody());
        variables.put("actionLabel", actionLabelFor(notification.getType()));
        variables.put("actionUrl", absoluteLink(notification.getLinkPath()));
        variables.put("year", LocalDateTime.now().getYear());
        List<EmailDetail> details = details(notification);
        variables.put("details", details);
        variables.put("hasDetails", !details.isEmpty());
        variables.put("detailsSection", detailsSection(notification.getType(), details));
        variables.put("sectionHeading", heading(notification.getType()));
        return variables;
    }

    /**
     * Plain-text emails cannot loop over a model list safely, so the summary table is flattened
     * here. An empty string keeps the original spacing in the text template.
     */
    private static String detailsSection(NotificationType type, List<EmailDetail> details) {
        if (details.isEmpty()) {
            return "";
        }
        StringBuilder text = new StringBuilder("\n" + heading(type) + "\n\n");
        for (EmailDetail row : details) {
            text.append(String.format("%-18s %s", row.label() + ":", row.value())).append('\n');
        }
        text.append('\n');
        return text.toString();
    }

    private static String heading(NotificationType type) {
        return switch (type) {
            case BOOKING_CONFIRMED, REBOOKING_CONFIRMED -> "Booking details";
            case HOTEL_AT_RISK, HOTEL_UPDATE -> "Stay details";
            default -> "Journey update";
        };
    }

    /**
     * A missing booking must never block a message that is otherwise correct, so the summary table
     * is best-effort.
     */
    private List<EmailDetail> details(Notification notification) {
        try {
            return detailsFactory.forNotification(notification);
        } catch (RuntimeException ex) {
            log.warn("Could not build the summary table for notification {}: {}",
                    notification.getId(), describe(ex));
            return List.of();
        }
    }

    private String absoluteLink(String linkPath) {
        if (linkPath == null || linkPath.isBlank()) {
            return frontendOrigin + "/app/dashboard";
        }
        if (linkPath.startsWith("http://") || linkPath.startsWith("https://")) {
            return linkPath;
        }
        return frontendOrigin + (linkPath.startsWith("/") ? "" : "/") + linkPath;
    }

    private static String templateFor(NotificationType type) {
        return switch (type) {
            case DISRUPTION, DISRUPTION_UPDATED -> "disruption";
            case DISRUPTION_RESOLVED -> "disruption-resolved";
            case SEAT_ALERT -> "seat-alert";
            case BOOKING_CONFIRMED -> "booking-confirmed";
            case REBOOKING_CONFIRMED -> "rebooking-confirmed";
            case HOTEL_AT_RISK, HOTEL_UPDATE -> "hotel-update";
            case PAYMENT, SYSTEM, ANNOUNCEMENT -> "notification";
        };
    }

    private static String actionLabelFor(NotificationType type) {
        return switch (type) {
            case DISRUPTION, DISRUPTION_UPDATED -> "View options";
            case DISRUPTION_RESOLVED, BOOKING_CONFIRMED, REBOOKING_CONFIRMED -> "View journey";
            case SEAT_ALERT -> "View seats";
            case HOTEL_AT_RISK, HOTEL_UPDATE -> "View stay";
            default -> "Open TrainConcierge";
        };
    }

    /** Stored on the row, so operators can see which of the three failure modes occurred. */
    private static String safeError(Exception ex) {
        if (ex instanceof MailAuthenticationException) {
            return "The mail server rejected the sign-in details.";
        }
        if (ex instanceof MailException || ex instanceof MessagingException) {
            return "The mail server did not accept the message.";
        }
        return "The email could not be delivered.";
    }

    /** Full cause chain for the log only — the stored error stays generic. */
    private static String describe(Exception ex) {
        Throwable root = ex;
        while (root.getCause() != null && root.getCause() != root) {
            root = root.getCause();
        }
        String message = root.getMessage();
        return ex.getClass().getSimpleName() + ": "
                + (message == null || message.isBlank() ? "(no message)" : message);
    }

    private static TemplateEngine templateEngine(TemplateMode mode, String suffix) {
        ClassLoaderTemplateResolver resolver = new ClassLoaderTemplateResolver();
        resolver.setPrefix("templates/mail/");
        resolver.setSuffix(suffix);
        resolver.setTemplateMode(mode);
        resolver.setCharacterEncoding(StandardCharsets.UTF_8.name());
        resolver.setCacheable(true);
        SpringTemplateEngine engine = new SpringTemplateEngine();
        engine.setTemplateResolver(resolver);
        return engine;
    }

    private static String stripTrailingSlash(String value) {
        if (value == null || value.isBlank()) {
            return "http://localhost:5173";
        }
        return value.endsWith("/") ? value.substring(0, value.length() - 1) : value;
    }
}
