package com.trainconcierge.notification;

import com.trainconcierge.travel.SeatAlertService;
import com.trainconcierge.travel.SettingsService;
import com.trainconcierge.travel.dto.ClassAvailabilityResponse;
import com.trainconcierge.travel.dto.TrainSearchItemResponse;
import com.trainconcierge.user.User;
import com.trainconcierge.user.UserRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;

@Service
public class SeatAlertNotifier implements SeatAlertService {

    private static final int MAX_ALERTS_PER_SEARCH = 3;

    private final SettingsService settingsService;
    private final SeatAlertLogRepository logRepository;
    private final PreferenceService preferenceService;
    private final NotificationService notificationService;
    private final UserRepository userRepository;

    public SeatAlertNotifier(SettingsService settingsService, SeatAlertLogRepository logRepository,
                             PreferenceService preferenceService,
                             NotificationService notificationService,
                             UserRepository userRepository) {
        this.settingsService = settingsService;
        this.logRepository = logRepository;
        this.preferenceService = preferenceService;
        this.notificationService = notificationService;
        this.userRepository = userRepository;
    }

    @Override
    public void onSearch(Long userId, List<TrainSearchItemResponse> results, LocalDate travelDate) {
        if (userId == null || results.isEmpty()) {
            return;
        }
        User user = userRepository.findById(userId).orElse(null);
        if (user == null || !preferenceService.forUser(user).isSeatAlertsEnabled()) {
            return;
        }
        int threshold = settingsService.plentyThreshold();
        LocalDateTime now = LocalDateTime.now();
        int alerts = 0;
        for (TrainSearchItemResponse result : results) {
            if (alerts >= MAX_ALERTS_PER_SEARCH) {
                break;
            }
            ClassAvailabilityResponse seatClass = lowestClassUnder(result, threshold);
            if (seatClass == null) {
                continue;
            }
            SeatAlertLog log = logRepository
                    .findByUserIdAndTrainNumberAndTravelDate(userId, result.trainNumber(),
                            travelDate)
                    .orElse(null);
            if (log != null && log.getCreatedAt().isAfter(now.minusHours(1))) {
                continue;
            }
            boolean created = notificationService.notifySeatAlert(user, result, seatClass,
                    travelDate);
            if (!created) {
                continue;
            }
            if (log == null) {
                log = SeatAlertLog.create(userId, result.trainNumber(), travelDate,
                        seatClass.code(), seatClass.available(), now);
            } else {
                log.refresh(seatClass.code(), seatClass.available(), now);
            }
            logRepository.save(log);
            alerts++;
        }
    }

    private ClassAvailabilityResponse lowestClassUnder(TrainSearchItemResponse result,
                                                       int threshold) {
        return result.classes().stream()
                .filter(seatClass -> seatClass.available() <= threshold)
                .min(Comparator.comparingInt(ClassAvailabilityResponse::available))
                .orElse(null);
    }
}
