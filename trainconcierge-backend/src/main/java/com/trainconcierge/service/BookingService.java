package com.trainconcierge.service;

import com.trainconcierge.dto.BookingDto;
import com.trainconcierge.dto.BookingRequest;
import com.trainconcierge.dto.RebookRequest;
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
public class BookingService {

    private final BookingRepository bookingRepository;
    private final UserRepository userRepository;
    private final TrainRepository trainRepository;
    private final NotificationService notificationService;

    @Transactional
    public BookingDto createBooking(Long userId, BookingRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        Train train = trainRepository.findById(request.getTrainId())
                .orElseThrow(() -> new RuntimeException("Train not found"));

        if (train.getStatus() == Train.TrainStatus.CANCELLED) {
            throw new RuntimeException("Cannot book a cancelled train");
        }
        if (train.getAvailableSeats() < request.getNumberOfSeats()) {
            throw new RuntimeException("Insufficient seats available. Available: " + train.getAvailableSeats());
        }

        train.setAvailableSeats(train.getAvailableSeats() - request.getNumberOfSeats());
        trainRepository.save(train);

        double total = train.getPrice() * request.getNumberOfSeats();
        Booking booking = Booking.builder()
                .user(user)
                .train(train)
                .numberOfSeats(request.getNumberOfSeats())
                .totalAmount(total)
                .status(Booking.BookingStatus.CONFIRMED)
                .build();

        Booking saved = bookingRepository.save(booking);

        notificationService.sendNotification(
                userId,
                "Booking Confirmed",
                "Your booking for " + train.getTrainName() + " (" + train.getTrainNumber() +
                        ") on " + train.getTravelDate() + " is confirmed. Seats: " + request.getNumberOfSeats(),
                Notification.NotificationType.BOOKING_CONFIRMED,
                saved.getId()
        );

        return toDto(saved);
    }

    @Transactional
    public BookingDto cancelBooking(Long bookingId, Long userId) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new RuntimeException("Booking not found"));

        if (!booking.getUser().getId().equals(userId)) {
            throw new RuntimeException("Access denied");
        }
        if (booking.getStatus() == Booking.BookingStatus.CANCELLED) {
            throw new RuntimeException("Booking already cancelled");
        }

        // Restore seats
        Train train = booking.getTrain();
        train.setAvailableSeats(train.getAvailableSeats() + booking.getNumberOfSeats());
        trainRepository.save(train);

        booking.setStatus(Booking.BookingStatus.CANCELLED);
        booking.setCancelledAt(LocalDateTime.now());
        booking.setCancellationReason("Cancelled by user");
        Booking saved = bookingRepository.save(booking);

        notificationService.sendNotification(
                userId,
                "Booking Cancelled",
                "Your booking #" + bookingId + " for " + train.getTrainName() + " has been cancelled.",
                Notification.NotificationType.BOOKING_CANCELLED,
                bookingId
        );

        return toDto(saved);
    }

    @Transactional
    public BookingDto rebookPassenger(Long userId, RebookRequest request) {
        Booking original = bookingRepository.findById(request.getOriginalBookingId())
                .orElseThrow(() -> new RuntimeException("Original booking not found"));

        if (!original.getUser().getId().equals(userId)) {
            throw new RuntimeException("Access denied");
        }

        Train newTrain = trainRepository.findById(request.getNewTrainId())
                .orElseThrow(() -> new RuntimeException("New train not found"));

        int seats = request.getNumberOfSeats() > 0 ? request.getNumberOfSeats() : original.getNumberOfSeats();

        if (newTrain.getAvailableSeats() < seats) {
            throw new RuntimeException("Insufficient seats on new train");
        }

        // Mark original as rebooked
        original.setStatus(Booking.BookingStatus.REBOOKED);
        bookingRepository.save(original);

        // Restore seats on old train
        Train oldTrain = original.getTrain();
        oldTrain.setAvailableSeats(oldTrain.getAvailableSeats() + original.getNumberOfSeats());
        trainRepository.save(oldTrain);

        // Deduct from new train
        newTrain.setAvailableSeats(newTrain.getAvailableSeats() - seats);
        trainRepository.save(newTrain);

        // Create new booking
        User user = original.getUser();
        Booking newBooking = Booking.builder()
                .user(user)
                .train(newTrain)
                .numberOfSeats(seats)
                .totalAmount(newTrain.getPrice() * seats)
                .status(Booking.BookingStatus.CONFIRMED)
                .originalBookingId(original.getId())
                .build();
        Booking saved = bookingRepository.save(newBooking);

        notificationService.sendNotification(
                userId,
                "Rebooking Confirmed",
                "You have been rebooked on " + newTrain.getTrainName() + " (" + newTrain.getTrainNumber() +
                        ") on " + newTrain.getTravelDate() + ". Original booking #" + original.getId() + " is preserved.",
                Notification.NotificationType.REBOOKING_CONFIRMED,
                saved.getId()
        );

        return toDto(saved);
    }

    public List<BookingDto> getUserBookings(Long userId) {
        return bookingRepository.findByUserIdOrderByBookedAtDesc(userId)
                .stream().map(this::toDto).collect(Collectors.toList());
    }

    public BookingDto getBookingById(Long bookingId, Long userId) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new RuntimeException("Booking not found"));
        if (!booking.getUser().getId().equals(userId)) {
            throw new RuntimeException("Access denied");
        }
        return toDto(booking);
    }

    public BookingDto toDto(Booking booking) {
        Train train = booking.getTrain();
        return BookingDto.builder()
                .id(booking.getId())
                .userId(booking.getUser().getId())
                .username(booking.getUser().getUsername())
                .trainId(train.getId())
                .trainNumber(train.getTrainNumber())
                .trainName(train.getTrainName())
                .fromStation(train.getFromStation())
                .toStation(train.getToStation())
                .travelDate(train.getTravelDate().toString())
                .departureTime(train.getDepartureTime().toString())
                .arrivalTime(train.getArrivalTime().toString())
                .numberOfSeats(booking.getNumberOfSeats())
                .totalAmount(booking.getTotalAmount())
                .status(booking.getStatus().name())
                .bookedAt(booking.getBookedAt())
                .cancelledAt(booking.getCancelledAt())
                .cancellationReason(booking.getCancellationReason())
                .originalBookingId(booking.getOriginalBookingId())
                .trainStatus(train.getStatus().name())
                .trainDelayMinutes(train.getDelayMinutes())
                .build();
    }
}
