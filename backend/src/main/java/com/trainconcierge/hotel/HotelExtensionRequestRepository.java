package com.trainconcierge.hotel;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface HotelExtensionRequestRepository extends JpaRepository<HotelExtensionRequest, Long> {
    List<HotelExtensionRequest> findByHotelBookingIdOrderByCreatedAtDesc(Long hotelBookingId);

    @org.springframework.data.jpa.repository.Query("""
        SELECT r FROM HotelExtensionRequest r
        WHERE (:status IS NULL OR CAST(r.status AS string) = :status)
        ORDER BY r.createdAt DESC
        """)
    org.springframework.data.domain.Page<HotelExtensionRequest> findAllAdmin(
            @org.springframework.data.repository.query.Param("status") String status,
            org.springframework.data.domain.Pageable pageable);
}
