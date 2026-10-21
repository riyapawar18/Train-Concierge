package com.trainconcierge.config;

import com.trainconcierge.entity.Train;
import com.trainconcierge.entity.User;
import com.trainconcierge.repository.TrainRepository;
import com.trainconcierge.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalTime;

@Component
@RequiredArgsConstructor
public class DataSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final TrainRepository trainRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        seedUsers();
        seedTrains();
    }

    private void seedUsers() {
        if (!userRepository.existsByUsername("admin")) {
            userRepository.save(User.builder()
                    .username("admin")
                    .password(passwordEncoder.encode("admin123"))
                    .email("admin@trainconcierge.com")
                    .fullName("System Admin")
                    .role(User.Role.ADMIN)
                    .build());
        }
        if (!userRepository.existsByUsername("passenger1")) {
            userRepository.save(User.builder()
                    .username("passenger1")
                    .password(passwordEncoder.encode("pass123"))
                    .email("passenger1@example.com")
                    .fullName("Riya Pawar")
                    .role(User.Role.PASSENGER)
                    .build());
        }
        if (!userRepository.existsByUsername("passenger2")) {
            userRepository.save(User.builder()
                    .username("passenger2")
                    .password(passwordEncoder.encode("pass123"))
                    .email("passenger2@example.com")
                    .fullName("Arjun Sharma")
                    .role(User.Role.PASSENGER)
                    .build());
        }
    }

    private void seedTrains() {
        // Always refresh seed data so dates stay current.
        // We upsert by trainNumber: skip if the train already exists today or in the future,
        // delete-and-recreate if it has an expired (past) travel date.
        LocalDate today = LocalDate.now();
        LocalDate tomorrow = today.plusDays(1);
        LocalDate dayAfter = today.plusDays(2);

        upsertTrain(Train.builder()
                .trainNumber("12001")
                .trainName("Shatabdi Express")
                .fromStation("Mumbai")
                .toStation("Delhi")
                .travelDate(tomorrow)
                .departureTime(LocalTime.of(6, 0))
                .arrivalTime(LocalTime.of(22, 0))
                .totalSeats(200)
                .availableSeats(145)
                .price(1200.0)
                .status(Train.TrainStatus.ON_TIME)
                .delayMinutes(0)
                .build());

        upsertTrain(Train.builder()
                .trainNumber("12002")
                .trainName("Rajdhani Express")
                .fromStation("Mumbai")
                .toStation("Delhi")
                .travelDate(tomorrow)
                .departureTime(LocalTime.of(8, 30))
                .arrivalTime(LocalTime.of(23, 30))
                .totalSeats(300)
                .availableSeats(210)
                .price(1500.0)
                .status(Train.TrainStatus.ON_TIME)
                .delayMinutes(0)
                .build());

        upsertTrain(Train.builder()
                .trainNumber("12003")
                .trainName("Duronto Express")
                .fromStation("Mumbai")
                .toStation("Delhi")
                .travelDate(tomorrow)
                .departureTime(LocalTime.of(14, 0))
                .arrivalTime(LocalTime.of(6, 0))
                .totalSeats(250)
                .availableSeats(180)
                .price(1350.0)
                .status(Train.TrainStatus.ON_TIME)
                .delayMinutes(0)
                .build());

        upsertTrain(Train.builder()
                .trainNumber("12004")
                .trainName("Garib Rath")
                .fromStation("Mumbai")
                .toStation("Delhi")
                .travelDate(dayAfter)
                .departureTime(LocalTime.of(10, 0))
                .arrivalTime(LocalTime.of(4, 0))
                .totalSeats(400)
                .availableSeats(320)
                .price(800.0)
                .status(Train.TrainStatus.ON_TIME)
                .delayMinutes(0)
                .build());

        upsertTrain(Train.builder()
                .trainNumber("12005")
                .trainName("Chennai Mail")
                .fromStation("Mumbai")
                .toStation("Chennai")
                .travelDate(tomorrow)
                .departureTime(LocalTime.of(7, 0))
                .arrivalTime(LocalTime.of(20, 0))
                .totalSeats(300)
                .availableSeats(220)
                .price(1100.0)
                .status(Train.TrainStatus.ON_TIME)
                .delayMinutes(0)
                .build());

        upsertTrain(Train.builder()
                .trainNumber("12006")
                .trainName("Deccan Queen")
                .fromStation("Pune")
                .toStation("Mumbai")
                .travelDate(today)
                .departureTime(LocalTime.of(7, 15))
                .arrivalTime(LocalTime.of(10, 30))
                .totalSeats(150)
                .availableSeats(80)
                .price(350.0)
                .status(Train.TrainStatus.ON_TIME)
                .delayMinutes(0)
                .build());

        upsertTrain(Train.builder()
                .trainNumber("12007")
                .trainName("Karnataka Express")
                .fromStation("Bangalore")
                .toStation("Delhi")
                .travelDate(tomorrow)
                .departureTime(LocalTime.of(20, 0))
                .arrivalTime(LocalTime.of(22, 0))
                .totalSeats(350)
                .availableSeats(200)
                .price(1800.0)
                .status(Train.TrainStatus.ON_TIME)
                .delayMinutes(0)
                .build());

        upsertTrain(Train.builder()
                .trainNumber("12008")
                .trainName("Howrah Mail")
                .fromStation("Delhi")
                .toStation("Kolkata")
                .travelDate(tomorrow)
                .departureTime(LocalTime.of(9, 45))
                .arrivalTime(LocalTime.of(9, 0))
                .totalSeats(280)
                .availableSeats(150)
                .price(1400.0)
                .status(Train.TrainStatus.ON_TIME)
                .delayMinutes(0)
                .build());

        // Additional routes to make the search more useful
        upsertTrain(Train.builder()
                .trainNumber("12009")
                .trainName("August Kranti Rajdhani")
                .fromStation("Mumbai")
                .toStation("Delhi")
                .travelDate(dayAfter)
                .departureTime(LocalTime.of(17, 40))
                .arrivalTime(LocalTime.of(10, 55))
                .totalSeats(300)
                .availableSeats(240)
                .price(1600.0)
                .status(Train.TrainStatus.ON_TIME)
                .delayMinutes(0)
                .build());

        upsertTrain(Train.builder()
                .trainNumber("12010")
                .trainName("Vande Bharat Express")
                .fromStation("Mumbai")
                .toStation("Pune")
                .travelDate(today)
                .departureTime(LocalTime.of(9, 0))
                .arrivalTime(LocalTime.of(11, 0))
                .totalSeats(160)
                .availableSeats(90)
                .price(450.0)
                .status(Train.TrainStatus.ON_TIME)
                .delayMinutes(0)
                .build());

        upsertTrain(Train.builder()
                .trainNumber("12011")
                .trainName("Coromandel Express")
                .fromStation("Kolkata")
                .toStation("Chennai")
                .travelDate(tomorrow)
                .departureTime(LocalTime.of(14, 25))
                .arrivalTime(LocalTime.of(13, 40))
                .totalSeats(320)
                .availableSeats(180)
                .price(1250.0)
                .status(Train.TrainStatus.ON_TIME)
                .delayMinutes(0)
                .build());

        upsertTrain(Train.builder()
                .trainNumber("12012")
                .trainName("Bangalore Rajdhani")
                .fromStation("Bangalore")
                .toStation("Delhi")
                .travelDate(dayAfter)
                .departureTime(LocalTime.of(20, 15))
                .arrivalTime(LocalTime.of(5, 55))
                .totalSeats(280)
                .availableSeats(190)
                .price(1950.0)
                .status(Train.TrainStatus.ON_TIME)
                .delayMinutes(0)
                .build());

        upsertTrain(Train.builder()
                .trainNumber("12013")
                .trainName("Chennai Rajdhani")
                .fromStation("Chennai")
                .toStation("Delhi")
                .travelDate(tomorrow)
                .departureTime(LocalTime.of(22, 0))
                .arrivalTime(LocalTime.of(17, 30))
                .totalSeats(280)
                .availableSeats(160)
                .price(1750.0)
                .status(Train.TrainStatus.ON_TIME)
                .delayMinutes(0)
                .build());

        upsertTrain(Train.builder()
                .trainNumber("12014")
                .trainName("Gitanjali Express")
                .fromStation("Mumbai")
                .toStation("Kolkata")
                .travelDate(tomorrow)
                .departureTime(LocalTime.of(16, 10))
                .arrivalTime(LocalTime.of(11, 50))
                .totalSeats(350)
                .availableSeats(210)
                .price(1100.0)
                .status(Train.TrainStatus.ON_TIME)
                .delayMinutes(0)
                .build());

        upsertTrain(Train.builder()
                .trainNumber("12015")
                .trainName("Sampark Kranti")
                .fromStation("Delhi")
                .toStation("Bangalore")
                .travelDate(dayAfter)
                .departureTime(LocalTime.of(21, 30))
                .arrivalTime(LocalTime.of(7, 0))
                .totalSeats(300)
                .availableSeats(175)
                .price(1650.0)
                .status(Train.TrainStatus.ON_TIME)
                .delayMinutes(0)
                .build());

        // ─────────────────────────────────────────────────────────────────────────
        // Miraj ↔ Pune route trains
        // Times below are the scheduled times at Miraj and Pune specifically.
        // These are based on published Indian Railways timetable information.
        // Labeled as TIMETABLE_DEMO — not live seat inventory.
        // Train number format: TC prefix avoids collisions with official numbers.
        // ─────────────────────────────────────────────────────────────────────────

        // 11023 Sahyadri Express: Mumbai CSMT → Kolhapur | stops at Pune and Miraj
        // At Miraj: arr 02:52, dep 02:55 | At Pune (boarding): dep 23:55
        // Seeded here with Miraj as fromStation and Pune as toStation for DB LIKE search
        upsertTrain(Train.builder()
                .trainNumber("TC11023")
                .trainName("Sahyadri Express (11023)")
                .fromStation("Miraj")
                .toStation("Pune")
                .travelDate(tomorrow)
                .departureTime(LocalTime.of(23, 55))  // Departs Pune
                .arrivalTime(LocalTime.of(2, 52))     // Arrives Miraj
                .totalSeats(500)
                .availableSeats(180)
                .price(215.0)
                .status(Train.TrainStatus.ON_TIME)
                .delayMinutes(0)
                .build());

        // 11024 Sahyadri Express: Kolhapur → Mumbai CSMT | stops at Miraj then Pune
        // At Miraj: dep 03:30 | At Pune: arr 07:50
        upsertTrain(Train.builder()
                .trainNumber("TC11024")
                .trainName("Sahyadri Express (11024)")
                .fromStation("Miraj")
                .toStation("Pune")
                .travelDate(tomorrow)
                .departureTime(LocalTime.of(3, 30))
                .arrivalTime(LocalTime.of(7, 50))
                .totalSeats(500)
                .availableSeats(210)
                .price(215.0)
                .status(Train.TrainStatus.ON_TIME)
                .delayMinutes(0)
                .build());

        // 12779 Goa Express: Vasco da Gama → H Nizamuddin | stops at Miraj then Pune
        // At Miraj: dep 22:40 | At Pune: arr 04:00 (+1 day)
        upsertTrain(Train.builder()
                .trainNumber("TC12779")
                .trainName("Goa Express (12779)")
                .fromStation("Miraj")
                .toStation("Pune")
                .travelDate(tomorrow)
                .departureTime(LocalTime.of(22, 40))
                .arrivalTime(LocalTime.of(4, 0))
                .totalSeats(424)
                .availableSeats(95)
                .price(230.0)
                .status(Train.TrainStatus.ON_TIME)
                .delayMinutes(0)
                .build());

        // 11097 Poorna Express: Ernakulam → H Nizamuddin | stops at Miraj then Pune
        // At Miraj: dep 09:30 | At Pune: arr 15:25
        upsertTrain(Train.builder()
                .trainNumber("TC11097")
                .trainName("Poorna Express (11097)")
                .fromStation("Miraj")
                .toStation("Pune")
                .travelDate(tomorrow)
                .departureTime(LocalTime.of(9, 30))
                .arrivalTime(LocalTime.of(15, 25))
                .totalSeats(392)
                .availableSeats(140)
                .price(205.0)
                .status(Train.TrainStatus.ON_TIME)
                .delayMinutes(0)
                .build());

        // 16533 Bgm Ypr Express (Bagalkot – Yeshwantpur) | stops at Miraj then Pune
        // At Miraj: dep 07:15 | At Pune: arr 13:30
        upsertTrain(Train.builder()
                .trainNumber("TC16533")
                .trainName("BGM YPR Express (16533)")
                .fromStation("Miraj")
                .toStation("Pune")
                .travelDate(tomorrow)
                .departureTime(LocalTime.of(7, 15))
                .arrivalTime(LocalTime.of(13, 30))
                .totalSeats(320)
                .availableSeats(120)
                .price(185.0)
                .status(Train.TrainStatus.ON_TIME)
                .delayMinutes(0)
                .build());

        // 11039 Maharashtra Express: Amravati → Kolhapur | stops at Pune, then Miraj
        // Reverse direction: Pune→Miraj. Seeded for Pune→Miraj searches.
        upsertTrain(Train.builder()
                .trainNumber("TC11039")
                .trainName("Maharashtra Express (11039)")
                .fromStation("Pune")
                .toStation("Miraj")
                .travelDate(tomorrow)
                .departureTime(LocalTime.of(15, 25))
                .arrivalTime(LocalTime.of(21, 40))
                .totalSeats(420)
                .availableSeats(155)
                .price(195.0)
                .status(Train.TrainStatus.ON_TIME)
                .delayMinutes(0)
                .build());

        // Miraj ↔ Kolhapur feeder
        upsertTrain(Train.builder()
                .trainNumber("TC71427")
                .trainName("Miraj Kolhapur DEMU (71427)")
                .fromStation("Miraj")
                .toStation("Kolhapur")
                .travelDate(today)
                .departureTime(LocalTime.of(6, 0))
                .arrivalTime(LocalTime.of(7, 30))
                .totalSeats(200)
                .availableSeats(110)
                .price(30.0)
                .status(Train.TrainStatus.ON_TIME)
                .delayMinutes(0)
                .build());

        // Sangli / Miraj area
        upsertTrain(Train.builder()
                .trainNumber("TC12163")
                .trainName("Dadar Solapur Express (12163)")
                .fromStation("Miraj")
                .toStation("Solapur")
                .travelDate(tomorrow)
                .departureTime(LocalTime.of(14, 10))
                .arrivalTime(LocalTime.of(17, 55))
                .totalSeats(300)
                .availableSeats(175)
                .price(130.0)
                .status(Train.TrainStatus.ON_TIME)
                .delayMinutes(0)
                .build());
    }

    /**
     * Insert the train if it does not exist, or refresh it if its travel date is in the past.
     * This keeps the seed data current on every application startup without overwriting
     * admin-created trains or disrupting live seat inventory.
     */
    private void upsertTrain(Train seed) {
        trainRepository.findByTrainNumber(seed.getTrainNumber())
                .ifPresentOrElse(existing -> {
                    // Refresh only if the existing travel date is strictly in the past
                    if (existing.getTravelDate().isBefore(LocalDate.now())) {
                        existing.setTravelDate(seed.getTravelDate());
                        existing.setAvailableSeats(seed.getTotalSeats()); // reset inventory
                        existing.setStatus(Train.TrainStatus.ON_TIME);
                        existing.setDelayMinutes(0);
                        existing.setCancellationReason(null);
                        trainRepository.save(existing);
                    }
                    // If travel date is today or future, leave it untouched
                }, () -> trainRepository.save(seed));
    }
}
