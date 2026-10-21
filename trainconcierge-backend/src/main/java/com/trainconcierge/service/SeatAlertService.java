package com.trainconcierge.service;

import com.trainconcierge.dto.SeatAlertDto;
import com.trainconcierge.dto.SeatAlertRequest;
import com.trainconcierge.entity.*;
import com.trainconcierge.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SeatAlertService {

    private final SeatAlertRepository seatAlertRepository;
    private final UserRepository userRepository;
    private final TrainRepository trainRepository;
    private final NotificationService notificationService;

    @Transactional
    public SeatAlertDto createAlert(Long userId, SeatAlertRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        SeatAlert alert = SeatAlert.builder()
                .user(user)
                .fromStation(request.getFromStation())
                .toStation(request.getToStation())
                .travelDate(request.getTravelDate())
                .seatsRequired(request.getSeatsRequired())
                .status(SeatAlert.AlertStatus.ACTIVE)
                .build();

        SeatAlert saved = seatAlertRepository.save(alert);

        // Check immediately if seats are available
        checkAndTriggerAlert(saved);

        return toDto(saved);
    }

    private void checkAndTriggerAlert(SeatAlert alert) {
        List<Train> trains = trainRepository.searchAvailableTrains(
                alert.getFromStation(), alert.getToStation(),
                alert.getTravelDate(), alert.getSeatsRequired());

        if (!trains.isEmpty() && alert.getStatus() == SeatAlert.AlertStatus.ACTIVE) {
            alert.setStatus(SeatAlert.AlertStatus.TRIGGERED);
            alert.setTriggeredAt(LocalDateTime.now());
            seatAlertRepository.save(alert);

            notificationService.sendNotification(
                    alert.getUser().getId(),
                    "Seats Available!",
                    alert.getSeatsRequired() + " seat(s) are now available from " +
                            alert.getFromStation() + " to " + alert.getToStation() +
                            " on " + alert.getTravelDate() + ". Book now!",
                    Notification.NotificationType.SEAT_AVAILABLE,
                    null
            );
        }
    }

    public List<SeatAlertDto> getUserAlerts(Long userId) {
        return seatAlertRepository.findByUserIdOrderByCreatedAtDesc(userId)
                .stream().map(this::toDto).collect(Collectors.toList());
    }

    @Transactional
    public void cancelAlert(Long alertId, Long userId) {
        SeatAlert alert = seatAlertRepository.findById(alertId)
                .orElseThrow(() -> new RuntimeException("Alert not found"));
        if (!alert.getUser().getId().equals(userId)) {
            throw new RuntimeException("Access denied");
        }
        alert.setStatus(SeatAlert.AlertStatus.CANCELLED);
        seatAlertRepository.save(alert);
    }

    public SeatAlertDto toDto(SeatAlert alert) {
        return SeatAlertDto.builder()
                .id(alert.getId())
                .userId(alert.getUser().getId())
                .fromStation(alert.getFromStation())
                .toStation(alert.getToStation())
                .travelDate(alert.getTravelDate())
                .seatsRequired(alert.getSeatsRequired())
                .status(alert.getStatus().name())
                .createdAt(alert.getCreatedAt())
                .triggeredAt(alert.getTriggeredAt())
                .build();
    }
}
