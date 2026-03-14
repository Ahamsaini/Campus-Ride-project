package com.campusride.dto;

import lombok.*;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SOSNotification {
    private UUID tripId;
    private String riderName;
    private String passengerName;
    private Double lastLat;
    private Double lastLng;
    private String timestamp; // Using String for stability
    private java.util.List<java.util.Map<String, Object>> nearbyRides;
}
