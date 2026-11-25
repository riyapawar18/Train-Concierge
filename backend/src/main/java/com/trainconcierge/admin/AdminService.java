package com.trainconcierge.admin;

import com.trainconcierge.booking.Booking;
import com.trainconcierge.booking.BookingRepository;
import com.trainconcierge.booking.BookingStatus;
import com.trainconcierge.booking.Journey;
import com.trainconcierge.booking.JourneyRepository;
import com.trainconcierge.booking.JourneyStatus;
import com.trainconcierge.common.audit.AuditLog;
import com.trainconcierge.common.audit.AuditLogRepository;
import com.trainconcierge.common.audit.AuditService;
import com.trainconcierge.common.error.ApiException;
import com.trainconcierge.disruption.DisruptionRepository;
import com.trainconcierge.disruption.DisruptionStatus;
import com.trainconcierge.disruption.JourneyImpact;
import com.trainconcierge.disruption.JourneyImpactRepository;
import com.trainconcierge.disruption.RecommendationEngine;
import com.trainconcierge.disruption.RecommendationRepository;
import com.trainconcierge.hotel.HotelBookingRepository;
import com.trainconcierge.hotel.HotelBookingStatus;
import com.trainconcierge.hotel.HotelExtensionRequest;
import com.trainconcierge.hotel.HotelExtensionRequestRepository;
import com.trainconcierge.hotel.HotelExtensionStatus;
import com.trainconcierge.hotel.HotelPolicyRepository;
import com.trainconcierge.hotel.HotelRepository;
import com.trainconcierge.hotel.HotelRoomRepository;
import com.trainconcierge.hotel.HotelService;
import com.trainconcierge.notification.Notification;
import com.trainconcierge.notification.NotificationChannel;
import com.trainconcierge.notification.NotificationRepository;
import com.trainconcierge.notification.NotificationService;
import com.trainconcierge.notification.NotificationType;
import com.trainconcierge.notification.SseHub;
import com.trainconcierge.travel.Setting;
import com.trainconcierge.travel.SettingRepository;
import com.trainconcierge.user.Role;
import com.trainconcierge.user.User;
import com.trainconcierge.user.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Service
public class AdminService {

    private final UserRepository userRepository;
    private final JourneyRepository journeyRepository;
    private final BookingRepository bookingRepository;
    private final DisruptionRepository disruptionRepository;
    private final JourneyImpactRepository impactRepository;
    private final RecommendationRepository recommendationRepository;
    private final RecommendationEngine recommendationEngine;
    private final NotificationRepository notificationRepository;
    private final NotificationService notificationService;
    private final HotelBookingRepository hotelBookingRepository;
    private final HotelExtensionRequestRepository extensionRequestRepository;
    private final HotelService hotelService;
    private final HotelRepository hotelRepository;
    private final HotelPolicyRepository hotelPolicyRepository;
    private final HotelRoomRepository hotelRoomRepository;
    private final SettingRepository settingRepository;
    private final AuditLogRepository auditLogRepository;
    private final AuditService auditService;
    private final SseHub sseHub;

    public AdminService(UserRepository userRepository,
                        JourneyRepository journeyRepository,
                        BookingRepository bookingRepository,
                        DisruptionRepository disruptionRepository,
                        JourneyImpactRepository impactRepository,
                        RecommendationRepository recommendationRepository,
                        RecommendationEngine recommendationEngine,
                        NotificationRepository notificationRepository,
                        NotificationService notificationService,
                        HotelBookingRepository hotelBookingRepository,
                        HotelExtensionRequestRepository extensionRequestRepository,
                        HotelService hotelService,
                        HotelRepository hotelRepository,
                        HotelPolicyRepository hotelPolicyRepository,
                        HotelRoomRepository hotelRoomRepository,
                        SettingRepository settingRepository,
                        AuditLogRepository auditLogRepository,
                        AuditService auditService,
                        SseHub sseHub) {
        this.userRepository = userRepository;
        this.journeyRepository = journeyRepository;
        this.bookingRepository = bookingRepository;
        this.disruptionRepository = disruptionRepository;
        this.impactRepository = impactRepository;
        this.recommendationRepository = recommendationRepository;
        this.recommendationEngine = recommendationEngine;
        this.notificationRepository = notificationRepository;
        this.notificationService = notificationService;
        this.hotelBookingRepository = hotelBookingRepository;
        this.extensionRequestRepository = extensionRequestRepository;
        this.hotelService = hotelService;
        this.hotelRepository = hotelRepository;
        this.hotelPolicyRepository = hotelPolicyRepository;
        this.hotelRoomRepository = hotelRoomRepository;
        this.settingRepository = settingRepository;
        this.auditLogRepository = auditLogRepository;
        this.auditService = auditService;
        this.sseHub = sseHub;
    }

    // -----------------------------------------------------------------------
    // Stats
    // -----------------------------------------------------------------------

    @Transactional(readOnly = true)
    public AdminStatsResponse getStats() {
        long totalPassengers = userRepository.countByRole(Role.PASSENGER);
        long activeJourneys = journeyRepository.countByStoredStatusIn(
                List.of(JourneyStatus.UPCOMING, JourneyStatus.ACTIVE, JourneyStatus.DISRUPTED));
        long activeDisruptions = disruptionRepository.countByStatus(DisruptionStatus.ACTIVE);
        long passengersAffected = impactRepository.countByDisruptionStatus(DisruptionStatus.ACTIVE);
        long rebooked = journeyRepository.countByStoredStatus(JourneyStatus.REBOOKED);
        LocalDateTime dayStart = LocalDate.now().atStartOfDay();
        long notificationsSentToday = notificationRepository.countSentSince(dayStart);
        long hotelStaysAtRisk = hotelBookingRepository.countByStatus(HotelBookingStatus.AT_RISK);
        return new AdminStatsResponse(totalPassengers, activeJourneys, activeDisruptions,
                passengersAffected, rebooked, notificationsSentToday, hotelStaysAtRisk);
    }

    @Transactional(readOnly = true)
    public List<DelayTrendPoint> getDelayTrend(int days) {
        java.time.LocalDate from = java.time.LocalDate.now().minusDays(days - 1);
        return disruptionRepository.delayTrend(from).stream().map(m -> {
            java.time.LocalDate date = java.time.LocalDate.parse(String.valueOf(m.get("date")));
            long count = ((Number) m.get("count")).longValue();
            double avg = ((Number) m.get("avgDelay")).doubleValue();
            return new DelayTrendPoint(date, count, avg);
        }).toList();
    }

    @Transactional(readOnly = true)
    public List<AuditLogEntry> getRecentActivity(int limit) {
        return auditLogRepository.findAll(
                PageRequest.of(0, limit, Sort.by(Sort.Direction.DESC, "createdAt")))
                .stream()
                .map(this::toAuditEntry)
                .toList();
    }

    // -----------------------------------------------------------------------
    // Passengers
    // -----------------------------------------------------------------------

    @Transactional(readOnly = true)
    public Page<PassengerSummary> listPassengers(String q, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("fullName"));
        if (q == null || q.isBlank()) {
            return userRepository.findByRole(Role.PASSENGER, pageable).map(this::toPassengerSummary);
        }
        String needle = "%" + q.trim().toLowerCase() + "%";
        return userRepository.searchPassengers(needle, pageable).map(this::toPassengerSummary);
    }

    @Transactional(readOnly = true)
    public PassengerDetail getPassenger(Long id) {
        User user = userRepository.findById(id).orElseThrow(ApiException::notFound);
        List<Journey> journeys = journeyRepository.findByUserIdOrderByCreatedAtDesc(user.getId());
        List<Notification> notifications = notificationRepository
                .findTop5ByUserIdAndChannelOrderByCreatedAtDescIdDesc(user.getId(), NotificationChannel.IN_APP);
        long hotelBookings = hotelBookingRepository.countByUserId(user.getId());
        return new PassengerDetail(toPassengerSummary(user), journeys.size(), hotelBookings,
                notifications.stream().map(this::toNotificationEntry).toList());
    }

    @Transactional
    public PassengerSummary setPassengerEnabled(Long id, boolean enabled, Long actorId) {
        User user = userRepository.findById(id).orElseThrow(ApiException::notFound);
        user.setEnabled(enabled);
        userRepository.save(user);
        auditService.record(actorId, enabled ? "PASSENGER_ENABLED" : "PASSENGER_DISABLED",
                "USER", id, "{}");
        return toPassengerSummary(user);
    }

    // -----------------------------------------------------------------------
    // Journeys
    // -----------------------------------------------------------------------

    @Transactional(readOnly = true)
    public Page<JourneyAdminSummary> listJourneys(String status, String train, String date,
                                                   String passenger, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        String trainLike = train != null ? "%" + train.toLowerCase() + "%" : null;
        return journeyRepository.findAllAdmin(status, train, trainLike, date, passenger, pageable)
                .map(this::toJourneySummary);
    }

    @Transactional
    public JourneyAdminSummary cancelJourney(Long id, String reason, Long actorId) {
        Journey journey = journeyRepository.findById(id).orElseThrow(ApiException::notFound);
        if (journey.getStoredStatus() == JourneyStatus.CANCELLED) {
            throw ApiException.conflict("Already cancelled");
        }
        journey.cancel();
        journeyRepository.save(journey);
        auditService.record(actorId, "JOURNEY_CANCELLED_BY_ADMIN", "JOURNEY", id,
                "{\"reason\":\"" + (reason == null ? "" : reason.replace("\"", "'")) + "\"}");
        return toJourneySummary(journey);
    }

    @Transactional
    public JourneyAdminSummary flagJourney(Long id, boolean flagged, Long actorId) {
        Journey journey = journeyRepository.findById(id).orElseThrow(ApiException::notFound);
        journey.setFlagged(flagged);
        journeyRepository.save(journey);
        auditService.record(actorId, flagged ? "JOURNEY_FLAGGED" : "JOURNEY_UNFLAGGED",
                "JOURNEY", id, "{}");
        return toJourneySummary(journey);
    }

    // -----------------------------------------------------------------------
    // Recommendations
    // -----------------------------------------------------------------------

    @Transactional(readOnly = true)
    public List<RecommendationAdminEntry> listRecommendations(Long disruptionId) {
        List<JourneyImpact> impacts = impactRepository
                .findByDisruptionIdOrderByCreatedAtAsc(disruptionId);
        return impacts.stream().flatMap(impact ->
                recommendationRepository.findByImpactIdOrderByRankAsc(impact.getId()).stream()
                        .map(r -> new RecommendationAdminEntry(
                                r.getId(), impact.getId(),
                                impact.getBooking().getPnr(),
                                r.getKind().name(),
                                r.getRefTrainNumber(),
                                r.getClassCode(),
                                r.getDepartureAt(),
                                r.getArrivalAt(),
                                r.getFare(),
                                r.getScore(),
                                r.getRank(),
                                r.isRecommended(),
                                r.getReasons(),
                                r.getWarnings()))).toList();
    }

    @Transactional
    public void regenerateRecommendations(Long impactId, Long actorId) {
        JourneyImpact impact = impactRepository.findById(impactId).orElseThrow(ApiException::notFound);
        recommendationEngine.generate(impact);
        auditService.record(actorId, "RECOMMENDATIONS_REGENERATED", "IMPACT", impactId, "{}");
    }

    // -----------------------------------------------------------------------
    // Extension requests
    // -----------------------------------------------------------------------

    @Transactional(readOnly = true)
    public Page<ExtensionRequestAdminEntry> listExtensionRequests(String status, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        return extensionRequestRepository.findAllAdmin(status, pageable)
                .map(this::toExtensionEntry);
    }

    @Transactional
    public ExtensionRequestAdminEntry resolveExtensionRequest(Long id, String decision,
                                                               String note, Long actorId) {
        HotelExtensionRequest req = extensionRequestRepository.findById(id)
                .orElseThrow(ApiException::notFound);
        HotelExtensionStatus newStatus = "APPROVED".equalsIgnoreCase(decision)
                ? HotelExtensionStatus.APPROVED : HotelExtensionStatus.DECLINED;
        req.setStatus(newStatus);
        req.setResponseNote(note);
        req.setResolvedAt(LocalDateTime.now());
        extensionRequestRepository.save(req);
        // If approved, update hotel booking status
        if (newStatus == HotelExtensionStatus.APPROVED
                && req.getType().name().equals("LATE_ARRIVAL")) {
            hotelBookingRepository.findById(req.getHotelBookingId()).ifPresent(b -> {
                b.setStatus(HotelBookingStatus.LATE_ARRIVAL_NOTED);
                hotelBookingRepository.save(b);
            });
        }
        auditService.record(actorId, "EXTENSION_REQUEST_" + newStatus.name(),
                "HOTEL_EXTENSION_REQUEST", id, "{\"note\":\"" + (note == null ? "" : note) + "\"}");
        // Notify passenger
        hotelBookingRepository.findById(req.getHotelBookingId()).ifPresent(booking -> {
            String title = newStatus == HotelExtensionStatus.APPROVED
                    ? "Extension request approved" : "Extension request declined";
            String body = newStatus == HotelExtensionStatus.APPROVED
                    ? "Your request for " + req.getType().name().toLowerCase().replace('_', ' ')
                    + " has been approved. " + (note != null ? note : "")
                    : "Your request for " + req.getType().name().toLowerCase().replace('_', ' ')
                    + " was declined. " + (note != null ? note : "");
            notificationService.sendHotelNotification(booking.getUserId(), title, body,
                    "/app/hotels/bookings/" + booking.getId(), "HOTEL_BOOKING", booking.getId());
        });
        return toExtensionEntry(req);
    }

    // -----------------------------------------------------------------------
    // Notifications
    // -----------------------------------------------------------------------

    @Transactional(readOnly = true)
    public Page<NotificationAdminEntry> listNotifications(String channel, String status,
                                                           int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        return notificationRepository.findAllAdmin(channel, status, pageable)
                .map(this::toNotificationEntry);
    }

    @Transactional
    public void announce(String target, String trainNumber, Long targetUserId,
                         String title, String body, Long actorId) {
        if ("ALL".equalsIgnoreCase(target)) {
            notificationService.sendAnnouncement(title, body);
        } else if ("TRAIN".equalsIgnoreCase(target) && trainNumber != null) {
            notificationService.sendTrainAnnouncement(trainNumber, title, body);
        } else if ("USER".equalsIgnoreCase(target) && targetUserId != null) {
            notificationService.sendUserAnnouncement(targetUserId, title, body);
        } else {
            throw ApiException.validation("target", "Choose ALL, TRAIN or USER.");
        }
        auditService.record(actorId, "ANNOUNCEMENT_SENT", "NOTIFICATION", null,
                "{\"target\":\"" + target + "\",\"title\":\"" + title + "\"}");
    }

    @Transactional
    public void retryNotification(Long id, Long actorId) {
        Notification n = notificationRepository.findById(id).orElseThrow(ApiException::notFound);
        notificationService.retryEmail(n.getId());
        auditService.record(actorId, "NOTIFICATION_RETRY", "NOTIFICATION", id, "{}");
    }

    // -----------------------------------------------------------------------
    // User roles
    // -----------------------------------------------------------------------

    @Transactional(readOnly = true)
    public Page<UserRoleEntry> listUsers(int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("email"));
        return userRepository.findAll(pageable).map(this::toUserRoleEntry);
    }

    @Transactional
    public UserRoleEntry changeRole(Long targetId, String newRoleStr, Long actorId) {
        if (targetId.equals(actorId)) {
            throw ApiException.conflict("You cannot change your own role.");
        }
        Role newRole;
        try {
            newRole = Role.valueOf(newRoleStr.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw ApiException.validation("role", "Invalid role.");
        }
        if (newRole == Role.PASSENGER) {
            long adminCount = userRepository.countByRole(Role.ADMIN);
            User target = userRepository.findById(targetId).orElseThrow(ApiException::notFound);
            if (target.getRole() == Role.ADMIN && adminCount <= 1) {
                throw ApiException.conflict("Cannot remove the last admin.");
            }
        }
        User updated = userRepository.findById(targetId).orElseThrow(ApiException::notFound);
        Role previousRole = updated.getRole();
        updated.changeRole(newRole);
        userRepository.save(updated);
        auditService.record(actorId, "ROLE_CHANGED", "USER", targetId,
                "{\"from\":\"" + previousRole + "\",\"to\":\"" + newRole + "\"}");
        return toUserRoleEntry(updated);
    }

    // -----------------------------------------------------------------------
    // Reports
    // -----------------------------------------------------------------------

    @Transactional(readOnly = true)
    public ReportData getReport(String name, LocalDate from, LocalDate to) {
        return switch (name.toLowerCase()) {
            case "disruptions" -> ReportData.disruptions(
                    disruptionRepository.disruptions(from, to));
            case "affected" -> ReportData.affected(
                    impactRepository.affectedPassengers(from, to));
            case "rebooking" -> ReportData.rebooking(
                    journeyRepository.rebookingStats(from, to));
            case "notifications" -> ReportData.notifications(
                    notificationRepository.deliveryStats(from, to));
            case "hotel-verdicts" -> ReportData.hotelVerdicts(
                    impactRepository.hotelVerdictDistribution(from, to));
            default -> throw ApiException.notFound();
        };
    }

    // -----------------------------------------------------------------------
    // Settings
    // -----------------------------------------------------------------------

    @Transactional(readOnly = true)
    public List<SettingEntry> listSettings() {
        return settingRepository.findAll(Sort.by("key")).stream()
                .map(s -> new SettingEntry(s.getKey(), s.getValue(), s.getDescription()))
                .toList();
    }

    @Transactional
    public SettingEntry updateSetting(String key, String value, Long actorId) {
        Setting setting = settingRepository.findById(key).orElseThrow(ApiException::notFound);
        // Validate numeric settings
        try {
            Integer.parseInt(value.trim());
        } catch (NumberFormatException e) {
            throw ApiException.validation("value", "Setting value must be a number.");
        }
        setting.setValue(value.trim());
        settingRepository.save(setting);
        auditService.record(actorId, "SETTING_UPDATED", "SETTING", null,
                "{\"key\":\"" + key + "\",\"value\":\"" + value + "\"}");
        return new SettingEntry(setting.getKey(), setting.getValue(), setting.getDescription());
    }

    // -----------------------------------------------------------------------
    // Mappers
    // -----------------------------------------------------------------------

    private PassengerSummary toPassengerSummary(User u) {
        long journeyCount = journeyRepository.countByUserId(u.getId());
        return new PassengerSummary(u.getId(), u.getFullName(), u.getEmail(), u.getMobile(),
                journeyCount, u.isEnabled(), u.getCreatedAt());
    }

    private JourneyAdminSummary toJourneySummary(Journey j) {
        Booking b = j.getBooking();
        return new JourneyAdminSummary(j.getId(), j.getUserId(), b.getPnr(),
                b.getTrain().getName(), b.getTrain().getNumber(), b.getTravelDate(),
                b.getFromStation().getName(), b.getToStation().getName(),
                j.getStoredStatus().name(), j.isFlagged(), j.getCreatedAt());
    }

    private AuditLogEntry toAuditEntry(AuditLog log) {
        return new AuditLogEntry(log.getId(), log.getActorUserId(), log.getAction(),
                log.getTargetType(), log.getTargetId(), log.getDetails(), log.getCreatedAt());
    }

    private NotificationAdminEntry toNotificationEntry(Notification n) {
        return new NotificationAdminEntry(n.getId(), n.getUserId(), n.getType().name(),
                n.getTitle(), n.getChannel().name(), n.getDeliveryStatus().name(),
                n.getDeliveryError(), n.getCreatedAt());
    }

    private UserRoleEntry toUserRoleEntry(User u) {
        return new UserRoleEntry(u.getId(), u.getFullName(), u.getEmail(), u.getRole().name(),
                u.isEnabled(), u.getCreatedAt());
    }

    private ExtensionRequestAdminEntry toExtensionEntry(HotelExtensionRequest r) {
        return new ExtensionRequestAdminEntry(r.getId(), r.getHotelBookingId(),
                r.getType().name(), r.getStatus().name(), r.getFeeEstimate(),
                r.getResponseNote(), r.getCreatedAt(), r.getResolvedAt());
    }
}
