package com.trainconcierge.hotel.dto;

import java.math.BigDecimal;

public record HotelPolicyResponse(
    String standardCheckinTime, String standardCheckoutTime,
    boolean lateArrivalAllowed, String lateArrivalCutoff,
    boolean lateCheckoutAllowed, String maxLateCheckoutTime,
    String lateCheckoutFeeType, BigDecimal lateCheckoutFeeAmount,
    boolean extraNightPossible, int freeChangeWindowHours,
    String extensionNeedsApproval
) {}
