package com.campusride.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class ReportResponseDTO {
    private UUID id;
    private String fromUserName;
    private String toUserName;
    private Integer pointImpact;
    private String reportText;
    private LocalDateTime createdAt;
    private UUID rideId;
}
