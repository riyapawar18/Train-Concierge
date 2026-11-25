package com.trainconcierge.notification;

import com.trainconcierge.user.Role;
import com.trainconcierge.user.User;
import com.trainconcierge.user.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.mail.javamail.JavaMailSenderImpl;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Properties;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;

/**
 * Sends one genuine booking email through Gmail's SMTP relay. It is skipped unless credentials are
 * exported, so CI stays green, but the moment {@code MAIL_USERNAME} and {@code MAIL_PASSWORD} exist
 * the assertion checks the real server's answer instead of a log line:
 *
 * <pre>
 *   export MAIL_USERNAME=you@gmail.com
 *   export MAIL_PASSWORD=abcd efgh ijkl mnop     # Gmail App Password, spaces allowed
 *   export MAIL_TEST_TO=you@gmail.com            # optional, defaults to MAIL_USERNAME
 *   mvn test -Dtest=GmailLiveSendTest
 * </pre>
 */
@EnabledIfEnvironmentVariable(named = "MAIL_USERNAME", matches = ".+")
class GmailLiveSendTest {

    @Test
    @SuppressWarnings("unchecked")
    void gmailAcceptsABookingConfirmation() throws Exception {
        String account = System.getenv("MAIL_USERNAME");
        String appPassword = System.getenv("MAIL_PASSWORD");
        String recipient = Optional.ofNullable(System.getenv("MAIL_TEST_TO")).filter(s -> !s.isBlank())
                .orElse(account);

        JavaMailSenderImpl sender = new JavaMailSenderImpl();
        sender.setHost(Optional.ofNullable(System.getenv("MAIL_HOST")).filter(s -> !s.isBlank())
                .orElse("smtp.gmail.com"));
        sender.setPort(Integer.parseInt(
                Optional.ofNullable(System.getenv("MAIL_PORT")).filter(s -> !s.isBlank())
                        .orElse("587")));
        sender.setUsername(account);
        sender.setPassword(appPassword);
        Properties props = new Properties();
        props.put("mail.smtp.auth", "true");
        props.put("mail.smtp.starttls.enable", "true");
        props.put("mail.smtp.starttls.required", "true");
        props.put("mail.smtp.connectiontimeout", "15000");
        props.put("mail.smtp.timeout", "20000");
        props.put("mail.smtp.writetimeout", "20000");
        sender.setJavaMailProperties(props);

        User passenger = User.create("Gmail Test", recipient, null, "hash", Role.PASSENGER, true);
        Notification email = Notification.create(passenger.getId(),
                NotificationType.BOOKING_CONFIRMED, "Booking confirmed: 9203716543",
                "Your journey on Rajdhani Express is confirmed.", "/app/journeys/1", "BOOKING", 1L,
                NotificationChannel.EMAIL, LocalDateTime.now());

        NotificationRepository notifications = mock(NotificationRepository.class);
        lenient().when(notifications.findById(1L)).thenReturn(Optional.of(email));
        lenient().when(notifications.save(any(Notification.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        UserRepository users = mock(UserRepository.class);
        lenient().when(users.findById(passenger.getId())).thenReturn(Optional.of(passenger));
        EmailDetailsFactory details = mock(EmailDetailsFactory.class);
        lenient().when(details.forNotification(any(Notification.class))).thenReturn(List.of(
                new EmailDetail("PNR", "9203716543"),
                new EmailDetail("Status", "Confirmed")));

        MailService service = new MailService(notifications, users,
                SmtpTestSupport.provider(sender), details, true, sender.getHost(),
                sender.getPort(), account, account, "http://localhost:5173");

        service.deliver(1L);

        System.out.println("Gmail " + sender.getHost() + ":" + sender.getPort() + " -> "
                + email.getDeliveryStatus() + " for " + recipient + " ("
                + String.valueOf(email.getDeliveryError()) + ')');

        assertThat(email.getDeliveryError()).isNull();
        assertThat(email.getDeliveryStatus()).isEqualTo(DeliveryStatus.SENT);
        assertThat(email.getAttempts()).isEqualTo(1);
    }
}
