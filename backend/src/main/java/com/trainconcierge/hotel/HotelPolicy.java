package com.trainconcierge.hotel;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalTime;

@Entity
@Table(name = "hotel_policies")
public class HotelPolicy {
    @Id @Column(name = "hotel_id") private Long hotelId;
    @Column(name = "standard_checkin_time", nullable = false) private LocalTime standardCheckinTime;
    @Column(name = "standard_checkout_time", nullable = false) private LocalTime standardCheckoutTime;
    @Column(name = "late_arrival_allowed", nullable = false) private boolean lateArrivalAllowed;
    @Column(name = "late_arrival_cutoff") private LocalTime lateArrivalCutoff;
    @Column(name = "late_checkout_allowed", nullable = false) private boolean lateCheckoutAllowed;
    @Column(name = "max_late_checkout_time") private LocalTime maxLateCheckoutTime;
    @Column(name = "late_checkout_fee_type", nullable = false) private String lateCheckoutFeeType;
    @Column(name = "late_checkout_fee_amount", nullable = false, precision = 10, scale = 2) private BigDecimal lateCheckoutFeeAmount;
    @Column(name = "extra_night_possible", nullable = false) private boolean extraNightPossible;
    @Column(name = "free_change_window_hours", nullable = false) private int freeChangeWindowHours;
    @Column(name = "extension_needs_approval", nullable = false) private String extensionNeedsApproval;

    public Long getHotelId() { return hotelId; }
    public LocalTime getStandardCheckinTime() { return standardCheckinTime; }
    public LocalTime getStandardCheckoutTime() { return standardCheckoutTime; }
    public boolean isLateArrivalAllowed() { return lateArrivalAllowed; }
    public LocalTime getLateArrivalCutoff() { return lateArrivalCutoff; }
    public boolean isLateCheckoutAllowed() { return lateCheckoutAllowed; }
    public LocalTime getMaxLateCheckoutTime() { return maxLateCheckoutTime; }
    public String getLateCheckoutFeeType() { return lateCheckoutFeeType; }
    public BigDecimal getLateCheckoutFeeAmount() { return lateCheckoutFeeAmount; }
    public boolean isExtraNightPossible() { return extraNightPossible; }
    public int getFreeChangeWindowHours() { return freeChangeWindowHours; }
    public String getExtensionNeedsApproval() { return extensionNeedsApproval; }
}
