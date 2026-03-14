package com.campusride.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class LeaderboardDTO {
    private String name;
    private String department;
    private double co2Saved;
    private int trustPoints;
}
