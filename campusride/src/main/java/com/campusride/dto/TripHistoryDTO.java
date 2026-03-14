package com.campusride.dto;

import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TripHistoryDTO {
    private UUID sessionId;
    private UUID rideId;
    private String riderName;
    private String riderEmail;
    private String passengerName;
    private String passengerEmail;
    private Double pickupLat;
    private Double pickupLng;
    private LocalDateTime startedAt;
    private LocalDateTime endedAt;
    private String status;
}
