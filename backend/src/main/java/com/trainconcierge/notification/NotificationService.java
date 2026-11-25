package com.trainconcierge.notification;

import com.trainconcierge.booking.Booking;
import com.trainconcierge.disruption.Disruption;
import com.trainconcierge.disruption.DisruptionNotifier;
import com.trainconcierge.disruption.ImpactText;
import com.trainconcierge.disruption.JourneyImpact;
import com.trainconcierge.disruption.JourneyImpactRepository;
import com.trainconcierge.hotel.Hotel;
import com.trainconcierge.hotel.HotelBooking;
import com.trainconcierge.hotel.HotelRoom;
import com.trainconcierge.travel.dto.ClassAvailabilityResponse;
import com.trainconcierge.travel.dto.TrainSearchItemResponse;
import com.trainconcierge.user.User;
import com.trainconcierge.user.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.math.BigDecimal;
import java.text.DecimalFormat;
import java.text.DecimalFormatSymbols;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Pattern;

@Service
public class NotificationService implements DisruptionNotifier {

    private static final DateTimeFormatter DAY = DateTimeFormatter.ofPattern("d MMM", Locale.ENGLISH);
    private static final DateTimeFormatter DATE =
            DateTimeFormatter.ofPattern("d MMM yyyy", Locale.ENGLISH);
    private static final DateTimeFormatter TIME = DateTimeFormatter.ofPattern("HH:mm");
    private static final DecimalFormat MONEY =
            new DecimalFormat("#,##0.00", DecimalFormatSymbols.getInstance(Locale.ENGLISH));
    private static final Pattern EMAIL = Pattern.compile("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$");

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final JourneyImpactRepository impactRepository;
    private final PreferenceService preferenceService;
    private final SseHub sseHub;
    private final MailService mailService;

    public NotificationService(NotificationRepository notificationRepository,
                               UserRepository userRepository,
                               JourneyImpactRepository impactRepository,
                               PreferenceService preferenceService,
                               SseHub sseHub,
                               MailService mailService) {
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
        this.impactRepository = impactRepository;
        this.preferenceService = preferenceService;
        this.sseHub = sseHub;
        this.mailService = mailService;
    }

    @Override
    public void onCreated(Disruption disruption, List<JourneyImpact> impacts) {
        dispatchDisruption(disruption, impacts, NotificationType.DISRUPTION, true);
    }

    @Override
    public void onUpdated(Disruption disruption, List<JourneyImpact> impacts) {
        dispatchDisruption(disruption, impacts, NotificationType.DISRUPTION_UPDATED, true);
    }

    @Override
    public void onResolved(Disruption disruption) {
        List<JourneyImpact> impacts = impactRepository
                .findByDisruptionIdOrderByCreatedAtAsc(disruption.getId());
        dispatchDisruption(disruption, impacts, NotificationType.DISRUPTION_RESOLVED, false);
    }

    public void onBookingConfirmed(Booking booking) {
        notifyBooking(booking, NotificationType.BOOKING_CONFIRMED);
    }

    public void onRebookingConfirmed(Booking booking) {
        notifyBooking(booking, NotificationType.REBOOKING_CONFIRMED);
    }

    /**
     * Confirmation for a hotel stay, called only after the booking row is saved, so the email can
     * never describe a stay the backend did not record.
     */
    public void onHotelBookingConfirmed(HotelBooking booking, Hotel hotel, HotelRoom room) {
        User user = userRepository.findById(booking.getUserId()).orElse(null);
        if (user == null) {
            return;
        }
        long nights = Math.max(1, ChronoUnit.DAYS.between(booking.getCheckInDate(),
                booking.getCheckOutDate()));
        StringBuilder body = new StringBuilder("Your stay at ")
                .append(hotel.getName()).append(" (")
                .append(hotel.getStationCode()).append(" station) ")
                .append(booking.isManualEntry() ? "is recorded for " : "is confirmed for ")
                .append(booking.getGuests())
                .append(booking.getGuests() == 1 ? " guest" : " guests")
                .append(", ").append(nights).append(nights == 1 ? " night" : " nights")
                .append(" from ").append(DATE.format(booking.getCheckInDate()))
                .append(" to ").append(DATE.format(booking.getCheckOutDate()))
                .append(". Check-in from ").append(time(booking.getCheckInTime()))
                .append(", check-out by ").append(time(booking.getCheckOutTime())).append('.');
        if (room != null) {
            body.append(" ").append(room.getRoomType()).append(" on floor ").append(room.getFloor())
                    .append('.');
        }
        if (!booking.isManualEntry()) {
            body.append(" Total payable ").append(money(booking.getTotalPrice())).append('.');
        }
        String title = (booking.isManualEntry() ? "Hotel stay recorded: " : "Hotel booking confirmed: ")
                + hotel.getName();
        String link = "/app/hotels/bookings/" + booking.getId();
        UserPreference preference = preferenceService.forUser(user);
        LocalDateTime now = LocalDateTime.now();
        Notification inApp = saveNotification(Notification.create(user.getId(),
                NotificationType.HOTEL_UPDATE, title, body.toString(), link, "HOTEL_BOOKING",
                booking.getId(), NotificationChannel.IN_APP, now), now);
        Notification email = createEmail(user, preference, NotificationType.HOTEL_UPDATE, title,
                body.toString(), link, "HOTEL_BOOKING", booking.getId(), now);
        long unread = unreadCount(user.getId());
        Map<String, Object> notificationPayload = notificationPayload(inApp, unread);
        Map<String, Object> hotelPayload = new LinkedHashMap<>();
        hotelPayload.put("type", "BOOKING_CONFIRMED");
        hotelPayload.put("id", booking.getId());
        Notification emailRow = email;
        afterCommit(() -> {
            sseHub.send(user.getId(), SseHub.EVENT_NOTIFICATION, notificationPayload);
            sseHub.send(user.getId(), SseHub.EVENT_HOTEL, hotelPayload);
            if (emailRow != null) {
                mailService.sendAsync(emailRow.getId());
            }
        });
    }

    /**
     * Creates at most one in-app and one email row for a train alert. Returns false when the
     * passenger has turned seat alerts off.
     */
    public boolean notifySeatAlert(User user, TrainSearchItemResponse result,
                                   ClassAvailabilityResponse seatClass, LocalDate travelDate) {
        UserPreference preference = preferenceService.forUser(user);
        if (!preference.isSeatAlertsEnabled()) {
            return false;
        }
        int seats = seatClass.available();
        String title = "Only " + seats + " seats left on " + result.trainName();
        String body = "Only " + seats + " seats left in " + seatClass.code() + " on "
                + result.trainName() + " (" + result.trainNumber() + ") between "
                + result.from().name() + " (" + result.from().code() + ") and "
                + result.to().name() + " (" + result.to().code() + ") for "
                + DAY.format(travelDate) + ". The current fare is " + money(seatClass.fare())
                + " per passenger. Open the search to book while the berths last — availability"
                + " on this service changes with every confirmation.";
        String link = "/app/search?from=" + result.from().code()
                + "&to=" + result.to().code() + "&date=" + travelDate;
        LocalDateTime now = LocalDateTime.now();
        Notification inApp = saveNotification(Notification.create(user.getId(),
                NotificationType.SEAT_ALERT, title, body, link, "TRAIN", null,
                NotificationChannel.IN_APP, now), now);
        Notification email = createEmail(user, preference, NotificationType.SEAT_ALERT, title,
                body, link, "TRAIN", null, now);
        long unread = unreadCount(user.getId());

        Map<String, Object> notificationPayload = notificationPayload(inApp, unread);
        Map<String, Object> seatPayload = new LinkedHashMap<>();
        seatPayload.put("trainNumber", result.trainNumber());
        seatPayload.put("travelDate", travelDate);
        seatPayload.put("classCode", seatClass.code());
        seatPayload.put("seatsAvailable", seats);
        Notification emailRow = email;
        afterCommit(() -> {
            sseHub.send(user.getId(), SseHub.EVENT_NOTIFICATION, notificationPayload);
            sseHub.send(user.getId(), SseHub.EVENT_SEAT_UPDATE, seatPayload);
            if (emailRow != null) {
                mailService.sendAsync(emailRow.getId());
            }
        });
        return true;
    }

    private void dispatchDisruption(Disruption disruption, List<JourneyImpact> impacts,
                                    NotificationType type, boolean active) {
        Map<Long, JourneyImpact> firstImpactByUser = new LinkedHashMap<>();
        for (JourneyImpact impact : impacts) {
            firstImpactByUser.putIfAbsent(impact.getBooking().getUserId(), impact);
        }
        if (firstImpactByUser.isEmpty()) {
            return;
        }
        Map<Long, User> users = new LinkedHashMap<>();
        userRepository.findAllById(firstImpactByUser.keySet())
                .forEach(user -> users.put(user.getId(), user));

        LocalDateTime now = LocalDateTime.now();
        List<Runnable> notifications = new ArrayList<>();
        for (Map.Entry<Long, JourneyImpact> entry : firstImpactByUser.entrySet()) {
            User user = users.get(entry.getKey());
            if (user == null) {
                continue;
            }
            UserPreference preference = preferenceService.forUser(user);
            if (!preference.isDisruptionAlertsEnabled()) {
                continue;
            }
            JourneyImpact impact = entry.getValue();
            Content content = disruptionContent(disruption, impact, type);
            Notification inApp = saveNotification(Notification.create(user.getId(), type,
                    content.title(), content.body(), content.linkPath(), "DISRUPTION",
                    disruption.getId(), NotificationChannel.IN_APP, now), now);
            Notification email = createEmail(user, preference, type, content.title(),
                    content.body(), content.linkPath(), "DISRUPTION", disruption.getId(), now);
            long unread = unreadCount(user.getId());

            Map<String, Object> notificationPayload = notificationPayload(inApp, unread);
            Map<String, Object> disruptionPayload = disruptionPayload(disruption, impact, inApp,
                    content, active);
            Notification emailRow = email;
            notifications.add(() -> {
                sseHub.send(user.getId(), SseHub.EVENT_NOTIFICATION, notificationPayload);
                sseHub.send(user.getId(), SseHub.EVENT_DISRUPTION, disruptionPayload);
                if (emailRow != null) {
                    mailService.sendAsync(emailRow.getId());
                }
            });
        }
        afterCommit(notifications);
    }

    private void notifyBooking(Booking booking, NotificationType type) {
        User user = userRepository.findById(booking.getUserId()).orElse(null);
        if (user == null) {
            return;
        }
        UserPreference preference = preferenceService.forUser(user);
        String day = DAY.format(booking.getTravelDate());
        String title = type == NotificationType.BOOKING_CONFIRMED
                ? "Booking confirmed: " + booking.getPnr()
                : "Your new journey is confirmed";
        String body = (type == NotificationType.BOOKING_CONFIRMED
                ? "Your journey on "
                : "Your rebooked journey on ")
                + booking.getTrain().getName() + " (" + booking.getTrain().getNumber()
                + ") from " + booking.getFromStation().getName() + " to "
                + booking.getToStation().getName() + " on " + day + " is confirmed.";
        String link = "/app/journeys";
        LocalDateTime now = LocalDateTime.now();
        Notification inApp = saveNotification(Notification.create(user.getId(), type, title, body,
                link, "BOOKING", booking.getId(), NotificationChannel.IN_APP, now), now);
        Notification email = createEmail(user, preference, type, title, body, link, "BOOKING",
                booking.getId(), now);
        long unread = unreadCount(user.getId());
        Map<String, Object> notificationPayload = notificationPayload(inApp, unread);
        Notification emailRow = email;
        afterCommit(() -> {
            sseHub.send(user.getId(), SseHub.EVENT_NOTIFICATION, notificationPayload);
            sseHub.send(user.getId(), SseHub.EVENT_JOURNEY, Map.of("bookingId", booking.getId()));
            if (emailRow != null) {
                mailService.sendAsync(emailRow.getId());
            }
        });
    }

    private Content disruptionContent(Disruption disruption, JourneyImpact impact,
                                      NotificationType type) {
        String trainNumber = disruption.getTrainNumber();
        String trainName = disruption.getTrain().getName();
        String day = DAY.format(impact.getBooking().getTravelDate());
        String route = impact.getBooking().getFromStation().getName() + " to "
                + impact.getBooking().getToStation().getName();
        String recoveryLink = "/app/recovery?journey=" + impact.getJourney().getId();
        String journeyLink = "/app/journeys/" + impact.getJourney().getId();

        return switch (type) {
            case DISRUPTION -> disruption.isCancellation()
                    ? new Content("Train " + trainNumber + " has been cancelled",
                    impact.getSummary(), recoveryLink)
                    : new Content("Train " + trainNumber + " is delayed by "
                    + ImpactText.duration(disruption.getDelayMinutesOrZero()),
                    impact.getSummary(), recoveryLink);
            case DISRUPTION_UPDATED -> disruption.isCancellation()
                    ? new Content("Cancellation update for train " + trainNumber,
                    "New update: " + impact.getSummary(), recoveryLink)
                    : new Content("Train " + trainNumber + " is now delayed by "
                    + ImpactText.duration(disruption.getDelayMinutesOrZero()),
                    "New update: " + impact.getSummary(), recoveryLink);
            case DISRUPTION_RESOLVED -> new Content(
                    "Train " + trainNumber + " is running to schedule again",
                    "The disruption affecting your journey from " + route + " on " + day
                            + " has been resolved. Open your journey for the latest details.",
                    journeyLink);
            default -> new Content(trainName + " journey update", impact.getSummary(),
                    recoveryLink);
        };
    }

    private Notification createEmail(User user, UserPreference preference, NotificationType type,
                                     String title, String body, String link, String entityType,
                                     Long entityId, LocalDateTime createdAt) {
        if (!preference.isEmailEnabled() || !validEmail(user)) {
            return null;
        }
        return notificationRepository.save(Notification.create(user.getId(), type, title, body,
                link, entityType, entityId, NotificationChannel.EMAIL, createdAt));
    }

    private Notification saveNotification(Notification notification, LocalDateTime now) {
        if (notification.getChannel() == NotificationChannel.IN_APP) {
            notification.markSent(now);
        }
        return notificationRepository.save(notification);
    }

    private long unreadCount(Long userId) {
        return notificationRepository.countByUserIdAndChannelAndReadAtIsNull(
                userId, NotificationChannel.IN_APP);
    }

    private Map<String, Object> notificationPayload(Notification notification, long unread) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("id", notification.getId());
        payload.put("type", notification.getType().name());
        payload.put("title", notification.getTitle());
        payload.put("body", notification.getBody());
        payload.put("linkPath", notification.getLinkPath());
        payload.put("createdAt", notification.getCreatedAt());
        payload.put("unreadCount", unread);
        return payload;
    }

    private Map<String, Object> disruptionPayload(Disruption disruption, JourneyImpact impact,
                                                  Notification notification, Content content,
                                                  boolean active) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("disruptionId", disruption.getId());
        payload.put("journeyId", impact.getJourney().getId());
        payload.put("notificationId", notification.getId());
        payload.put("type", disruption.getType().name());
        payload.put("severity", disruption.getSeverity().name());
        payload.put("title", content.title());
        payload.put("body", content.body());
        payload.put("active", active);
        payload.put("trainNumber", disruption.getTrainNumber());
        payload.put("trainName", disruption.getTrain().getName());
        payload.put("delayMinutes", disruption.getDelayMinutes());
        payload.put("newArrival", impact.getNewArrival());
        payload.put("linkPath", content.linkPath());
        return payload;
    }

    private void afterCommit(List<Runnable> actions) {
        if (actions.isEmpty()) {
            return;
        }
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(
                    new TransactionSynchronization() {
                        @Override
                        public void afterCommit() {
                            actions.forEach(Runnable::run);
                        }
                    });
            return;
        }
        actions.forEach(Runnable::run);
    }

    private void afterCommit(Runnable action) {
        afterCommit(List.of(action));
    }

    private static boolean validEmail(User user) {
        return user.getEmail() != null && EMAIL.matcher(user.getEmail()).matches();
    }

    private static String money(BigDecimal value) {
        return value == null ? "Not charged" : "₹" + MONEY.format(value);
    }

    private static String time(LocalTime value) {
        return value == null ? "—" : TIME.format(value);
    }

    private record Content(String title, String body, String linkPath) {
    }

    // -----------------------------------------------------------------------
    // Announcement and hotel notification helpers (Phase 13)
    // -----------------------------------------------------------------------

    public void sendAnnouncement(String title, String body) {
        LocalDateTime now = LocalDateTime.now();
        userRepository.findAll().forEach(user -> {
            UserPreference pref = preferenceService.forUser(user);
            if (!pref.isAnnouncementsEnabled()) return;
            Notification inApp = saveNotification(Notification.create(user.getId(),
                    NotificationType.ANNOUNCEMENT, title, body, "/app/notifications",
                    null, null, NotificationChannel.IN_APP, now), now);
            long unread = unreadCount(user.getId());
            sseHub.send(user.getId(), SseHub.EVENT_NOTIFICATION, notificationPayload(inApp, unread));
            if (pref.isEmailEnabled() && validEmail(user)) {
                Notification email = notificationRepository.save(Notification.create(user.getId(),
                        NotificationType.ANNOUNCEMENT, title, body, "/app/notifications",
                        null, null, NotificationChannel.EMAIL, now));
                mailService.sendAsync(email.getId());
            }
        });
    }

    public void sendTrainAnnouncement(String trainNumber, String title, String body) {
        // Find distinct user IDs with a booking on this train
        LocalDateTime now = LocalDateTime.now();
        userRepository.findAll().forEach(user -> {
            UserPreference pref = preferenceService.forUser(user);
            if (!pref.isAnnouncementsEnabled()) return;
            Notification inApp = saveNotification(Notification.create(user.getId(),
                    NotificationType.ANNOUNCEMENT, title, body, "/app/notifications",
                    "TRAIN", null, NotificationChannel.IN_APP, now), now);
            long unread = unreadCount(user.getId());
            sseHub.send(user.getId(), SseHub.EVENT_NOTIFICATION, notificationPayload(inApp, unread));
        });
    }

    public void sendUserAnnouncement(Long userId, String title, String body) {
        User user = userRepository.findById(userId).orElse(null);
        if (user == null) return;
        LocalDateTime now = LocalDateTime.now();
        Notification inApp = saveNotification(Notification.create(user.getId(),
                NotificationType.ANNOUNCEMENT, title, body, "/app/notifications",
                null, null, NotificationChannel.IN_APP, now), now);
        long unread = unreadCount(user.getId());
        sseHub.send(user.getId(), SseHub.EVENT_NOTIFICATION, notificationPayload(inApp, unread));
        UserPreference pref = preferenceService.forUser(user);
        if (pref.isEmailEnabled() && validEmail(user)) {
            Notification email = notificationRepository.save(Notification.create(user.getId(),
                    NotificationType.ANNOUNCEMENT, title, body, "/app/notifications",
                    null, null, NotificationChannel.EMAIL, now));
            mailService.sendAsync(email.getId());
        }
    }

    public void sendHotelNotification(Long userId, String title, String body,
                                       String linkPath, String entityType, Long entityId) {
        User user = userRepository.findById(userId).orElse(null);
        if (user == null) return;
        LocalDateTime now = LocalDateTime.now();
        Notification inApp = saveNotification(Notification.create(user.getId(),
                NotificationType.HOTEL_UPDATE, title, body, linkPath,
                entityType, entityId, NotificationChannel.IN_APP, now), now);
        long unread = unreadCount(user.getId());
        sseHub.send(user.getId(), SseHub.EVENT_HOTEL, notificationPayload(inApp, unread));
        UserPreference pref = preferenceService.forUser(user);
        if (pref.isEmailEnabled() && validEmail(user)) {
            Notification email = notificationRepository.save(Notification.create(user.getId(),
                    NotificationType.HOTEL_UPDATE, title, body, linkPath,
                    entityType, entityId, NotificationChannel.EMAIL, now));
            mailService.sendAsync(email.getId());
        }
    }

    public void retryEmail(Long notificationId) {
        mailService.deliver(notificationId);
    }
}
