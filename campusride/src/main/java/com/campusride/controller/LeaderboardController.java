package com.campusride.controller;

import com.campusride.dto.LeaderboardDTO;
import com.campusride.service.LeaderboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.List;

@RestController
@RequestMapping("/api/leaderboard")
@RequiredArgsConstructor
public class LeaderboardController {
    private final LeaderboardService leaderboardService;

    @GetMapping("/top-carbon")
    public ResponseEntity<List<LeaderboardDTO>> getTopCarbonSavers() {
        return ResponseEntity.ok(leaderboardService.getTopCarbonSavers());
    }
}
