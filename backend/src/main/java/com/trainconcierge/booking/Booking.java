package com.trainconcierge.booking;

import com.trainconcierge.catalog.Station;
import com.trainconcierge.catalog.Train;
import com.trainconcierge.travel.Fares;
import com.trainconcierge.travel.Quota;
import jakarta.persistence.CascadeType;
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
import jakarta.persistence.OneToMany;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "bookings")
public class Booking {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 10)
    private String pnr;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "train_number", nullable = false)
    private Train train;

    @Column(name = "travel_date", nullable = false)
    private LocalDate travelDate;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "from_station", nullable = false)
    private Station fromStation;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "to_station", nullable = false)
    private Station toStation;

    @Column(name = "boarding_time", nullable = false)
    private LocalDateTime boardingTime;

    @Column(name = "arrival_time", nullable = false)
    private LocalDateTime arrivalTime;

    @Column(name = "class_code", nullable = false, length = 4)
    private String classCode;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Quota quota;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private BookingStatus status;

    @Column(name = "base_fare", nullable = false, precision = 10, scale = 2)
    private BigDecimal baseFare;

    @Column(name = "reservation_charge", nullable = false, precision = 10, scale = 2)
    private BigDecimal reservationCharge;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal gst;

    @Column(name = "total_fare", nullable = false, precision = 10, scale = 2)
    private BigDecimal totalFare;

    @Column(name = "refund_amount", precision = 10, scale = 2)
    private BigDecimal refundAmount;

    @Column(name = "refund_percent")
    private Integer refundPercent;

    @Column(name = "source_booking_id")
    private Long sourceBookingId;

    @Column(name = "contact_email", length = 190)
    private String contactEmail;

    @Column(name = "contact_mobile", length = 20)
    private String contactMobile;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "cancelled_at")
    private LocalDateTime cancelledAt;

    @Version
    @Column(nullable = false)
    private long version;

    @OneToMany(mappedBy = "booking", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<BookingPassenger> passengers = new ArrayList<>();

    protected Booking() {
    }

    public static Booking create(String pnr, Long userId, Train train, LocalDate travelDate,
                                 Station fromStation, Station toStation, LocalDateTime boardingTime,
                                 LocalDateTime arrivalTime, String classCode, Quota quota,
                                 Fares.Quote quote, String contactEmail, String contactMobile,
                                 LocalDateTime createdAt) {
        Booking booking = new Booking();
        booking.pnr = pnr;
        booking.userId = userId;
        booking.train = train;
        booking.travelDate = travelDate;
        booking.fromStation = fromStation;
        booking.toStation = toStation;
        booking.boardingTime = boardingTime;
        booking.arrivalTime = arrivalTime;
        booking.classCode = classCode;
        booking.quota = quota;
        booking.status = BookingStatus.CONFIRMED;
        booking.baseFare = quote.baseFare();
        booking.reservationCharge = quote.reservationCharge();
        booking.gst = quote.gst();
        booking.totalFare = quote.totalFare();
        booking.contactEmail = contactEmail;
        booking.contactMobile = contactMobile;
        booking.createdAt = createdAt;
        return booking;
    }

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }

    public void addPassenger(BookingPassenger passenger) {
        passenger.attachTo(this);
        passengers.add(passenger);
    }

    public void cancel(LocalDateTime now, RefundPolicy.Refund refund) {
        this.status = BookingStatus.CANCELLED;
        this.cancelledAt = now;
        this.refundAmount = refund.amount();
        this.refundPercent = refund.percent();
    }

    public void rebook() {
        this.status = BookingStatus.REBOOKED;
    }

    public Long getId() {
        return id;
    }

    public String getPnr() {
        return pnr;
    }

    public Long getUserId() {
        return userId;
    }

    public Train getTrain() {
        return train;
    }

    public LocalDate getTravelDate() {
        return travelDate;
    }

    public Station getFromStation() {
        return fromStation;
    }

    public Station getToStation() {
        return toStation;
    }

    public LocalDateTime getBoardingTime() {
        return boardingTime;
    }

    public LocalDateTime getArrivalTime() {
        return arrivalTime;
    }

    public String getClassCode() {
        return classCode;
    }

    public Quota getQuota() {
        return quota;
    }

    public BookingStatus getStatus() {
        return status;
    }

    public BigDecimal getBaseFare() {
        return baseFare;
    }

    public BigDecimal getReservationCharge() {
        return reservationCharge;
    }

    public BigDecimal getGst() {
        return gst;
    }

    public BigDecimal getTotalFare() {
        return totalFare;
    }

    public BigDecimal getRefundAmount() {
        return refundAmount;
    }

    public Integer getRefundPercent() {
        return refundPercent;
    }

    public Long getSourceBookingId() {
        return sourceBookingId;
    }

    public String getContactEmail() {
        return contactEmail;
    }

    public String getContactMobile() {
        return contactMobile;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getCancelledAt() {
        return cancelledAt;
    }

    public long getVersion() {
        return version;
    }

    public List<BookingPassenger> getPassengers() {
        return passengers;
    }
}
