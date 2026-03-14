package com.campusride.dto;

import lombok.*;
import java.util.List;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SavedRouteResponseDTO {
    private UUID id;
    private String name;
    private Double startLat;
    private Double startLng;
    private Double endLat;
    private Double endLng;
    private List<double[]> routeCoordinates; // [[lat, lng]]
    private int usageCount;
    private boolean isAIPriority;
}
