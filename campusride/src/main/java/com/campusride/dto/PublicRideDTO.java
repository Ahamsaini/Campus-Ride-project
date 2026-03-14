package com.campusride.dto;

import lombok.*;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PublicRideDTO {
    private String riderFirstName;
    private String vehicleType;
    private Double currentLat;
    private Double currentLng;
    private List<double[]> routeCoordinates;
    private String status;
}
