package com.trainconcierge.hotel;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface HotelRoomRepository extends JpaRepository<HotelRoom, Long> {
    List<HotelRoom> findByHotelIdOrderByFloorAscRoomNoAsc(Long hotelId);
    List<HotelRoom> findByHotelIdAndRoomTypeOrderByFloorAsc(Long hotelId, String roomType);
}
