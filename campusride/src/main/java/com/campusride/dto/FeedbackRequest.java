package com.campusride.dto;

import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FeedbackRequest {
    @NotNull
    private UUID rideId;
    @NotNull
    private UUID toUserId;
    @NotNull
    private Integer pointImpact; // +5 or -5
    private boolean isReport;
    private String reportText;
}
