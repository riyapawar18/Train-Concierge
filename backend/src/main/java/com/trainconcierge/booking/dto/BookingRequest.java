package com.trainconcierge.booking.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.trainconcierge.travel.Quota;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.util.List;

public record BookingRequest(
        @NotBlank String trainNumber,
        @NotNull LocalDate date,
        @NotBlank String from,
        @NotBlank String to,
        @JsonAlias("class") @NotBlank String classCode,
        Quota quota,
        @NotEmpty @Size(max = 6) List<@Valid BookingPassengerRequest> passengers,
        @NotEmpty @Size(max = 6) List<@NotNull Long> holdIds,
        @Email @Size(max = 190) String contactEmail,
        @Size(max = 20) String contactMobile
) {
}
