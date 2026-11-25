package com.trainconcierge.notification;

import com.icegreen.greenmail.configuration.GreenMailConfiguration;
import com.icegreen.greenmail.util.GreenMail;
import com.icegreen.greenmail.util.ServerSetup;
import com.trainconcierge.user.Role;
import com.trainconcierge.user.User;
import com.trainconcierge.user.UserRepository;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
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
 * Drives {@link MailService} against a real, in-process SMTP server so the assertions prove the
 * message actually crossed a wire protocol — a mocked sender can never show that.
 */
class SmtpDeliveryTest {

    private static final String LOGIN = "trainconcierge";
    private static final String SENDER = LOGIN + "@localhost";
    private static final String PASSWORD = "secret";

    private GreenMail smtp;
    private JavaMailSenderImpl sender;

    @BeforeEach
    void startMailServer() {
        smtp = new GreenMail(new ServerSetup(0, "127.0.0.1", ServerSetup.PROTOCOL_SMTP));
        smtp.withConfiguration(GreenMailConfiguration.aConfig().withUser(SENDER, PASSWORD));
        smtp.start();
        sender = new JavaMailSenderImpl();
        sender.setHost("127.0.0.1");
        sender.setPort(smtp.getSmtp().getPort());
        sender.setUsername(SENDER);
        sender.setPassword(PASSWORD);
        Properties props = new Properties();
        props.put("mail.smtp.auth", "true");
        props.put("mail.smtp.starttls.enable", "false");
        sender.setJavaMailProperties(props);
    }

    @AfterEach
    void stopMailServer() {
        smtp.stop();
    }

    @Test
    @SuppressWarnings("unchecked")
    void handsABookingEmailToTheMailServer() throws Exception {
        User passenger = User.create("Asha Kulkarni", "asha@example.com", null, "hash",
                Role.PASSENGER, true);
        Notification email = Notification.create(passenger.getId(),
                NotificationType.BOOKING_CONFIRMED, "Booking confirmed: 9203716543",
                "Your journey on Rajdhani Express is confirmed.", "/app/journeys", "BOOKING", 7L,
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
                new EmailDetail("Fare paid", "₹1,585.00")));

        MailService service = new MailService(notifications, users,
                SmtpTestSupport.provider(sender), details, true, "127.0.0.1", sender.getPort(), LOGIN,
                LOGIN + "@localhost", "http://localhost:5173");

        service.deliver(1L);

        assertThat(email.getDeliveryError()).isNull();
        assertThat(email.getDeliveryStatus()).isEqualTo(DeliveryStatus.SENT);
        MimeMessage[] received = smtp.getReceivedMessages();
        assertThat(received).hasSize(1);
        assertThat(received[0].getSubject()).isEqualTo("Booking confirmed: 9203716543");
        assertThat(received[0].getAllRecipients()[0].toString()).isEqualTo("asha@example.com");
        assertThat(((InternetAddress) received[0].getFrom()[0]).getAddress())
                .isEqualTo(SENDER);
        assertThat(((InternetAddress) received[0].getFrom()[0]).getPersonal())
                .isEqualTo("TrainConcierge");
        assertThat(SmtpTestSupport.part(received[0], "text/html"))
                .contains("Booking details", "9203716543", "Fare paid", "₹1,585.00",
                        "http://localhost:5173/app/journeys");
        assertThat(SmtpTestSupport.part(received[0], "text/plain"))
                .contains("PNR:", "9203716543", "View journey");
    }

    @Test
    @SuppressWarnings("unchecked")
    void recordsTheFailureWhenTheMailServerRejectsTheCredentials() {
        User passenger = User.create("Asha Kulkarni", "asha@example.com", null, "hash",
                Role.PASSENGER, true);
        Notification email = Notification.create(passenger.getId(), NotificationType.DISRUPTION,
                "Train 12951 is delayed", "Your journey is affected.", "/app/journeys",
                "DISRUPTION", 3L, NotificationChannel.EMAIL, LocalDateTime.now());

        NotificationRepository notifications = mock(NotificationRepository.class);
        lenient().when(notifications.findById(1L)).thenReturn(Optional.of(email));
        lenient().when(notifications.save(any(Notification.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        UserRepository users = mock(UserRepository.class);
        lenient().when(users.findById(passenger.getId())).thenReturn(Optional.of(passenger));
        EmailDetailsFactory details = mock(EmailDetailsFactory.class);
        lenient().when(details.forNotification(any(Notification.class))).thenReturn(List.of());

        sender.setPassword("wrong-password");
        MailService service = new MailService(notifications, users, SmtpTestSupport.provider(sender), details,
                true, "127.0.0.1", sender.getPort(), LOGIN, LOGIN + "@localhost",
                "http://localhost:5173");

        service.deliver(1L);

        assertThat(email.getDeliveryStatus()).isEqualTo(DeliveryStatus.FAILED);
        assertThat(email.getAttempts()).isEqualTo(1);
        assertThat(email.getDeliveryError()).contains("sign-in details");
        assertThat(smtp.getReceivedMessages()).isEmpty();
    }
}
