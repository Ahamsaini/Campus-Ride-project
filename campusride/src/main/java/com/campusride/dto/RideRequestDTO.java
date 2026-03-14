package com.campusride.dto;

import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RideRequestDTO {

    @NotNull
    private UUID rideId;

    @NotNull
    private Double pickupLat;

    @NotNull
    private Double pickupLng;

    private Double dropoffLat;

    private Double dropoffLng;
}
