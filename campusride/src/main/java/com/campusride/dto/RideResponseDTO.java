package com.campusride.dto;

import lombok.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RideResponseDTO {

    private UUID id;
    private UUID riderId;
    private String riderName;
    private String riderDept;
    private String riderCourse;
    private Integer riderYear;

    private Double startLat;
    private Double startLng;
    private String pickupLocationName;
    private Double endLat;
    private Double endLng;
    private String dropoffLocationName;

    /** The driver's full route as [lat, lng] pairs for drawing on the map */
    private List<double[]> routeCoordinates;

    private Integer seatsAvailable;
    private LocalDateTime departureTime;
    private String status;

    /** Vehicle details */
    private String vehicleType;
    private String plateNumber;

    /** Weighted match score: 0.0 – 1.0 */
    private Double matchScore;

    /**
     * Distance in meters from passenger's pickup to the nearest point on the route
     */
    private Double distanceFromRoute;

    /**
     * Distance in meters from passenger's dropoff to the nearest point on the route
     */
    private Double dropoffDistFromRoute;

    private Boolean emergencyActive;
    private Double estimatedContribution;
    private String trackingToken;
    private Boolean sharingActive;
    private Integer riderTrustScore;
}
