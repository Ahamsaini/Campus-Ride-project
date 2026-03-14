package com.campusride.dto;

import lombok.*;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateRouteRequest {
    private String name;
    private Double startLat;
    private Double startLng;
    private Double endLat;
    private Double endLng;
    private List<double[]> routeCoordinates; // [[lng, lat]]
}
