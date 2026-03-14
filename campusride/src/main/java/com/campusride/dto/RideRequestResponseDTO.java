package com.campusride.dto;

import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RideRequestResponseDTO {
    private UUID id;
    private RideInfoDTO ride;
    private PassengerDTO passenger;
    private Double pickupLat;
    private Double pickupLng;
    private Double dropoffLat;
    private Double dropoffLng;
    private String status;
    private boolean riderAccepted;
    private boolean passengerAccepted;
    private LocalDateTime createdAt;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class RideInfoDTO {
        private UUID id;
        private RiderDTO rider;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class RiderDTO {
        private String name;
        private String department;
        private String course;
        private Integer year;
        private Integer trustScore;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class PassengerDTO {
        private UUID id;
        private String name;
        private String email;
        private String phone;
        private String department;
        private String course;
        private Integer year;
        private Integer trustScore;
    }
}
