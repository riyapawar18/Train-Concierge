package com.trainconcierge.notification;

import com.trainconcierge.user.Role;
import com.trainconcierge.user.User;
import com.trainconcierge.user.UserRepository;
import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.mail.MailAuthenticationException;
import org.springframework.mail.MailSendException;
import org.springframework.mail.javamail.JavaMailSender;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Properties;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MailServiceTest {

    private static final long NOTIFICATION_ID = 41L;

    @Mock
    private NotificationRepository notificationRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private JavaMailSender mailSender;

    @Mock
    private EmailDetailsFactory detailsFactory;

    private ObjectProvider<JavaMailSender> mailSenderProvider;

    private MailService mailService;
    private User user;
    private Notification notification;
    private MimeMessage message;

    @BeforeEach
    @SuppressWarnings("unchecked")
    void setUp() {
        mailSenderProvider = org.mockito.Mockito.mock(ObjectProvider.class);
        lenient().when(mailSenderProvider.getIfAvailable()).thenReturn(mailSender);
        lenient().when(detailsFactory.forNotification(any(Notification.class)))
                .thenReturn(List.of());
        mailService = new MailService(notificationRepository, userRepository, mailSenderProvider,
                detailsFactory, true, "smtp.example.com", 587, "rails@test.example.com",
                "no-reply@example.com", "http://localhost:5173/");
        user = User.create("Asha Kulkarni", "asha@example.com", null, "hash", Role.PASSENGER, true);
        notification = Notification.create(1L, NotificationType.DISRUPTION,
                "Train 11007 is delayed by 3h 15m", "Your journey from Pune to Mumbai is delayed.",
                "/app/recovery?journey=12", "DISRUPTION", 5L, NotificationChannel.EMAIL,
                LocalDateTime.now());
        message = new MimeMessage(Session.getInstance(new Properties()));
        lenient().when(notificationRepository.save(any(Notification.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        lenient().when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        lenient().when(mailSender.createMimeMessage()).thenReturn(message);
    }

    @Test
    void sendsAnHtmlAndTextEmailAndMarksTheRowAsSent() throws Exception {
        when(notificationRepository.findById(NOTIFICATION_ID))
                .thenReturn(Optional.of(notification));

        mailService.deliver(NOTIFICATION_ID);

        assertThat(notification.getDeliveryStatus()).isEqualTo(DeliveryStatus.SENT);
        assertThat(notification.getAttempts()).isEqualTo(1);
        assertThat(notification.getSentAt()).isNotNull();
        assertThat(notification.getDeliveryError()).isNull();
        verify(mailSender).send(message);
        assertThat(message.getSubject()).isEqualTo("Train 11007 is delayed by 3h 15m");
    }

    @Test
    void marksTheRowWhenTheServerIsNotConfigured() {
        MailService unconfigured = new MailService(notificationRepository, userRepository,
                mailSenderProvider, detailsFactory, false, "", 587, "", "",
                "http://localhost:5173");
        when(notificationRepository.findById(NOTIFICATION_ID))
                .thenReturn(Optional.of(notification));

        unconfigured.deliver(NOTIFICATION_ID);

        assertThat(unconfigured.isConfigured()).isFalse();
        assertThat(notification.getDeliveryStatus()).isEqualTo(DeliveryStatus.FAILED);
        assertThat(notification.getDeliveryError())
                .isEqualTo(MailService.NOT_CONFIGURED_MESSAGE);
        assertThat(notification.getAttempts()).isZero();
        verifyNoInteractions(mailSender);
    }

    @Test
    void recordsAFailedAttemptWithoutLeakingDetails() {
        when(notificationRepository.findById(NOTIFICATION_ID))
                .thenReturn(Optional.of(notification));
        doThrow(new MailSendException("Connection refused to internal mail relay"))
                .when(mailSender).send(any(MimeMessage.class));

        mailService.deliver(NOTIFICATION_ID);

        assertThat(notification.getDeliveryStatus()).isEqualTo(DeliveryStatus.FAILED);
        assertThat(notification.getAttempts()).isEqualTo(1);
        assertThat(notification.getDeliveryError())
                .isEqualTo("The mail server did not accept the message.");
    }

    @Test
    void flagsRejectedCredentialsSeparatelyFromATransportFailure() {
        when(notificationRepository.findById(NOTIFICATION_ID))
                .thenReturn(Optional.of(notification));
        doThrow(new MailAuthenticationException("535-5.7.8 Username and Password not accepted"))
                .when(mailSender).send(any(MimeMessage.class));

        mailService.deliver(NOTIFICATION_ID);

        assertThat(notification.getDeliveryError())
                .isEqualTo("The mail server rejected the sign-in details.");
    }

    @Test
    void stillSendsWhenTheSummaryTableCannotBeBuilt() {
        when(notificationRepository.findById(NOTIFICATION_ID))
                .thenReturn(Optional.of(notification));
        when(detailsFactory.forNotification(any(Notification.class)))
                .thenThrow(new IllegalStateException("booking row vanished"));

        mailService.deliver(NOTIFICATION_ID);

        assertThat(notification.getDeliveryStatus()).isEqualTo(DeliveryStatus.SENT);
        verify(mailSender).send(message);
    }

    @Test
    void skipsRowsThatAreAlreadySent() {
        notification.markSent(LocalDateTime.now());
        when(notificationRepository.findById(NOTIFICATION_ID))
                .thenReturn(Optional.of(notification));

        mailService.deliver(NOTIFICATION_ID);

        assertThat(notification.getAttempts()).isZero();
        verify(mailSender, never()).send(any(MimeMessage.class));
        verifyNoInteractions(userRepository);
    }

    @Test
    void skipsInAppRows() {
        Notification inApp = Notification.create(user.getId(), NotificationType.DISRUPTION,
                "Title", "Body", "/app/journeys", "DISRUPTION", 5L, NotificationChannel.IN_APP,
                LocalDateTime.now());
        when(notificationRepository.findById(NOTIFICATION_ID)).thenReturn(Optional.of(inApp));

        mailService.deliver(NOTIFICATION_ID);

        verifyNoInteractions(mailSender, userRepository);
    }

    @Test
    void failsCleanlyWhenTheRecipientNoLongerExists() {
        when(notificationRepository.findById(NOTIFICATION_ID)).thenReturn(Optional.of(notification));
        when(userRepository.findById(1L)).thenReturn(Optional.empty());

        mailService.deliver(NOTIFICATION_ID);

        assertThat(notification.getDeliveryStatus()).isEqualTo(DeliveryStatus.FAILED);
        assertThat(notification.getDeliveryError()).isEqualTo("The recipient could not be found.");
        verifyNoInteractions(mailSender);
    }
    @Test
    void reportsConfigurationOnlyWithAnEnabledSenderHostAndFromAddress() {
        assertThat(mailService.isConfigured()).isTrue();
        assertThat(new MailService(notificationRepository, userRepository, mailSenderProvider,
                detailsFactory, true, " ", 587, "", "", "http://localhost:5173").isConfigured())
                .isFalse();
        assertThat(new MailService(notificationRepository, userRepository, mailSenderProvider,
                detailsFactory, true, "smtp.example.com", 587, "", "not-an-address",
                "http://localhost:5173").isConfigured()).isFalse();
    }

    @Test
    void sendsFromTheSignedInAccountWhenNoFromAddressIsConfigured() throws Exception {
        MailService gmailDefaults = new MailService(notificationRepository, userRepository,
                mailSenderProvider, detailsFactory, true, "smtp.gmail.com", 587,
                "trains@example.com", "", "http://localhost:5173");
        when(notificationRepository.findById(NOTIFICATION_ID))
                .thenReturn(Optional.of(notification));

        gmailDefaults.deliver(NOTIFICATION_ID);

        assertThat(gmailDefaults.isConfigured()).isTrue();
        assertThat(message.getFrom()[0].toString())
                .isEqualTo("TrainConcierge <trains@example.com>");
    }
}
