package com.campusride.service;

import com.campusride.dto.LeaderboardDTO;
import com.campusride.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class LeaderboardService {
    private final UserRepository userRepository;

    public List<LeaderboardDTO> getTopCarbonSavers() {
        return userRepository.findAll().stream()
                .map(u -> {
                    int score = u.getTrustScore() != null ? u.getTrustScore() : 0;
                    // Carbon saved calculation:
                    // Trust Score / 5 = number of trips (roughly, since each trip is +/- 5)
                    // Assuming 2km per trip and 0.12kg CO2 per km saved by carpooling
                    double tripEstimate = Math.max(0, score / 5.0);
                    double co2 = tripEstimate * 2.0 * 0.12;

                    return new LeaderboardDTO(
                            u.getName(),
                            u.getDepartment(),
                            Math.round(co2 * 100.0) / 100.0,
                            score);
                })
                .sorted((a, b) -> Double.compare(b.getCo2Saved(), a.getCo2Saved()))
                .limit(10)
                .collect(Collectors.toList());
    }
}
