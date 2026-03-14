package com.campusride.dto;

import jakarta.validation.constraints.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateRideRequest {

    @NotNull
    private Double startLat;

    @NotNull
    private Double startLng;

    @NotNull
    private Double endLat;

    @NotNull
    private Double endLng;

    private String pickupLocationName;
    private String dropoffLocationName;

    /**
     * Ordered list of [lng, lat] coordinate pairs defining the highway route.
     * Example: [[77.55, 29.96], [77.56, 29.97], ...]
     */
    @NotNull
    @Size(min = 2, message = "Route must have at least 2 points")
    private List<double[]> routeCoordinates;

    @Min(1)
    private int seatsAvailable;

    @NotNull
    private LocalDateTime departureTime;



    private java.util.UUID routeId;
}
