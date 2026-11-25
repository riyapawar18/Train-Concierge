package com.trainconcierge.recovery;

import com.fasterxml.jackson.annotation.JsonProperty;

public class RebookingDto {
    @JsonProperty("id")
    private Long id;
    @JsonProperty("sourceBookingId")
    private Long sourceBookingId;
    @JsonProperty("newBookingId")
    private Long newBookingId;
    @JsonProperty("status")
    private RebookingStatus status;

    public RebookingDto() {}

    public RebookingDto(Rebooking rebooking) {
        this.id = rebooking.getId();
        this.sourceBookingId = rebooking.getSourceBookingId();
        this.newBookingId = rebooking.getNewBookingId();
        this.status = rebooking.getStatus();
    }

    // getters & setters omitted for brevity
}
