package com.trainconcierge.service;

import com.trainconcierge.dto.DisruptionRequest;
import com.trainconcierge.dto.TrainDto;
import com.trainconcierge.entity.*;
import com.trainconcierge.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class DisruptionService {

    private final TrainRepository trainRepository;
    private final BookingRepository bookingRepository;
    private final NotificationService notificationService;
    private final TrainService trainService;

    @Transactional
    public TrainDto simulateDisruption(DisruptionRequest request) {
        Train train = trainRepository.findById(request.getTrainId())
                .orElseThrow(() -> new RuntimeException("Train not found"));

        List<Booking> affectedBookings = bookingRepository.findConfirmedByTrainId(train.getId());

        if ("CANCEL".equalsIgnoreCase(request.getType())) {
            train.setStatus(Train.TrainStatus.CANCELLED);
            train.setCancellationReason(request.getReason() != null ? request.getReason() : "Administrative cancellation");
            trainRepository.save(train);

            for (Booking booking : affectedBookings) {
                notificationService.sendNotification(
                        booking.getUser().getId(),
                        "Train Cancelled",
                        "Train " + train.getTrainName() + " (" + train.getTrainNumber() +
                                ") on " + train.getTravelDate() + " has been CANCELLED. Reason: " +
                                train.getCancellationReason() + ". Please rebook or request refund.",
                        Notification.NotificationType.TRAIN_CANCELLED,
                        booking.getId()
                );
                // Suggest alternatives
                List<Train> alternatives = trainRepository.searchAvailableTrains(
                        train.getFromStation(), train.getToStation(), train.getTravelDate(), booking.getNumberOfSeats());
                if (!alternatives.isEmpty()) {
                    Train alt = alternatives.stream().filter(t -> !t.getId().equals(train.getId())).findFirst().orElse(null);
                    if (alt != null) {
                        notificationService.sendNotification(
                                booking.getUser().getId(),
                                "Alternative Available",
                                "Alternative train: " + alt.getTrainName() + " (" + alt.getTrainNumber() +
                                        ") at " + alt.getDepartureTime() + " is available with " + alt.getAvailableSeats() + " seats.",
                                Notification.NotificationType.ALTERNATIVE_SUGGESTED,
                                booking.getId()
                        );
                    }
                }
            }
        } else if ("DELAY".equalsIgnoreCase(request.getType())) {
            train.setStatus(Train.TrainStatus.DELAYED);
            train.setDelayMinutes(request.getDelayMinutes());
            trainRepository.save(train);

            for (Booking booking : affectedBookings) {
                notificationService.sendNotification(
                        booking.getUser().getId(),
                        "Train Delayed",
                        "Train " + train.getTrainName() + " (" + train.getTrainNumber() +
                                ") is delayed by " + request.getDelayMinutes() + " minutes on " +
                                train.getTravelDate() + ".",
                        Notification.NotificationType.TRAIN_DELAYED,
                        booking.getId()
                );
            }
        }

        return trainService.toDto(trainRepository.findById(train.getId()).get());
    }

    @Transactional
    public TrainDto resetDisruption(Long trainId) {
        Train train = trainRepository.findById(trainId)
                .orElseThrow(() -> new RuntimeException("Train not found"));
        train.setStatus(Train.TrainStatus.ON_TIME);
        train.setDelayMinutes(0);
        train.setCancellationReason(null);
        return trainService.toDto(trainRepository.save(train));
    }
}
