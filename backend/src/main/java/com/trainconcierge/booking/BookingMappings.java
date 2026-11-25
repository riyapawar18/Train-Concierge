package com.trainconcierge.booking;

import com.trainconcierge.booking.dto.BookingPassengerResponse;
import com.trainconcierge.booking.dto.FareBreakdownResponse;
import com.trainconcierge.booking.dto.JourneyPassengerResponse;
import com.trainconcierge.booking.dto.StationRefResponse;
import com.trainconcierge.catalog.Station;
import com.trainconcierge.travel.SeatInventory;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;

final class BookingMappings {

    private BookingMappings() {
    }

    static StationRefResponse station(Station station) {
        return new StationRefResponse(station.getCode(), station.getName(), station.getCity());
    }

    static FareBreakdownResponse fare(Booking booking) {
        int count = Math.max(1, booking.getPassengers().size());
        BigDecimal perPassenger = booking.getBaseFare()
                .divide(BigDecimal.valueOf(count), 2, RoundingMode.HALF_UP);
        return new FareBreakdownResponse(booking.getBaseFare(), booking.getReservationCharge(),
                booking.getGst(), booking.getTotalFare(), perPassenger);
    }

    static BookingPassengerResponse passenger(BookingPassenger passenger, SeatInventory seat) {
        return new BookingPassengerResponse(passenger.getId(), passenger.getName(),
                passenger.getAge(), passenger.getGender().name(), passenger.getBerthPreference(),
                seat == null ? null : seat.getSeatNo(), seat == null ? null : seat.getBerthType(),
                passenger.getSeatLabel(), passenger.getCoachNo());
    }

    static JourneyPassengerResponse journeyPassenger(BookingPassenger passenger,
                                                     SeatInventory seat) {
        return new JourneyPassengerResponse(passenger.getId(), passenger.getName(),
                passenger.getAge(), passenger.getGender().name(), passenger.getBerthPreference(),
                seat == null ? null : seat.getSeatNo(), seat == null ? null : seat.getBerthType(),
                passenger.getSeatLabel(), passenger.getCoachNo());
    }

    static JourneyStatus effectiveStatus(Journey journey, LocalDateTime now) {
        Booking booking = journey.getBooking();
        return JourneyStatuses.effective(journey.getStoredStatus(), booking.getBoardingTime(),
                booking.getArrivalTime(), now);
    }
}
