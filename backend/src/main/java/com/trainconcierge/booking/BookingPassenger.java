package com.trainconcierge.booking;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "booking_passengers")
public class BookingPassenger {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "booking_id", nullable = false)
    private Booking booking;

    @Column(nullable = false, length = 120)
    private String name;

    @Column(nullable = false)
    private int age;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private Gender gender;

    @Column(name = "berth_preference", length = 4)
    private String berthPreference;

    @Column(name = "seat_inventory_id")
    private Long seatInventoryId;

    @Column(name = "seat_label", nullable = false, length = 24)
    private String seatLabel;

    @Column(name = "coach_no", nullable = false, length = 8)
    private String coachNo;

    protected BookingPassenger() {
    }

    public static BookingPassenger create(String name, int age, Gender gender,
                                          String berthPreference, Long seatInventoryId,
                                          String seatLabel, String coachNo) {
        BookingPassenger passenger = new BookingPassenger();
        passenger.name = name;
        passenger.age = age;
        passenger.gender = gender;
        passenger.berthPreference = berthPreference;
        passenger.seatInventoryId = seatInventoryId;
        passenger.seatLabel = seatLabel;
        passenger.coachNo = coachNo;
        return passenger;
    }

    void attachTo(Booking booking) {
        this.booking = booking;
    }

    public void rename(String name) {
        this.name = name;
    }

    public Long getId() {
        return id;
    }

    public Booking getBooking() {
        return booking;
    }

    public String getName() {
        return name;
    }

    public int getAge() {
        return age;
    }

    public Gender getGender() {
        return gender;
    }

    public String getBerthPreference() {
        return berthPreference;
    }

    public Long getSeatInventoryId() {
        return seatInventoryId;
    }

    public String getSeatLabel() {
        return seatLabel;
    }

    public String getCoachNo() {
        return coachNo;
    }
}
