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
public class RideHistoryDTO {
    private UUID rideId;
    private String riderName;
    private String departurePoint;
    private String destinationPoint;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private String status;
    private List<String> passengerNames;
    private List<double[]> routePath; // [[lat, lng]]
}
