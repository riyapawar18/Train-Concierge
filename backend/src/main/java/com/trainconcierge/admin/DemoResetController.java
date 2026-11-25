package com.trainconcierge.admin;

import com.trainconcierge.booking.DemoJourneySeeder;
import com.trainconcierge.disruption.DisruptionRepository;
import com.trainconcierge.disruption.JourneyImpactRepository;
import com.trainconcierge.disruption.RecommendationRepository;
import com.trainconcierge.hotel.DemoHotelBookingSeeder;
import com.trainconcierge.hotel.HotelBookingRepository;
import com.trainconcierge.hotel.HotelExtensionRequestRepository;
import com.trainconcierge.hotel.HotelImpactRepository;
import com.trainconcierge.notification.NotificationRepository;
import com.trainconcierge.recovery.RebookingRepository;
import org.springframework.context.annotation.Profile;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Demo-profile-only endpoint that resets the scenario to its initial state.
 * Absent entirely outside the {@code demo} profile.
 */
@RestController
@RequestMapping("/api/admin/demo")
@Profile("demo")
public class DemoResetController {

    private final DisruptionRepository disruptionRepository;
    private final JourneyImpactRepository impactRepository;
    private final RecommendationRepository recommendationRepository;
    private final NotificationRepository notificationRepository;
    private final RebookingRepository rebookingRepository;
    private final HotelImpactRepository hotelImpactRepository;
    private final HotelExtensionRequestRepository extensionRequestRepository;
    private final HotelBookingRepository hotelBookingRepository;
    private final DemoJourneySeeder journeySeeder;
    private final DemoHotelBookingSeeder hotelBookingSeeder;

    public DemoResetController(DisruptionRepository disruptionRepository,
                                JourneyImpactRepository impactRepository,
                                RecommendationRepository recommendationRepository,
                                NotificationRepository notificationRepository,
                                RebookingRepository rebookingRepository,
                                HotelImpactRepository hotelImpactRepository,
                                HotelExtensionRequestRepository extensionRequestRepository,
                                HotelBookingRepository hotelBookingRepository,
                                DemoJourneySeeder journeySeeder,
                                DemoHotelBookingSeeder hotelBookingSeeder) {
        this.disruptionRepository = disruptionRepository;
        this.impactRepository = impactRepository;
        this.recommendationRepository = recommendationRepository;
        this.notificationRepository = notificationRepository;
        this.rebookingRepository = rebookingRepository;
        this.hotelImpactRepository = hotelImpactRepository;
        this.extensionRequestRepository = extensionRequestRepository;
        this.hotelBookingRepository = hotelBookingRepository;
        this.journeySeeder = journeySeeder;
        this.hotelBookingSeeder = hotelBookingSeeder;
    }

    @PostMapping("/reset")
    public ResponseEntity<Map<String, String>> reset() {
        // Clear transient demo data in dependency order
        recommendationRepository.deleteAll();
        hotelImpactRepository.deleteAll();
        impactRepository.deleteAll();
        disruptionRepository.deleteAll();
        notificationRepository.deleteAll();
        extensionRequestRepository.deleteAll();
        hotelBookingRepository.deleteAll();
        rebookingRepository.deleteAll();
        // Re-seed
        try {
            journeySeeder.run(null);
            hotelBookingSeeder.run(null);
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("status", "error", "message", e.getMessage()));
        }
        return ResponseEntity.ok(Map.of("status", "ok",
                "message", "Demo scenario reset. Journeys and hotel bookings reseeded."));
    }
}
