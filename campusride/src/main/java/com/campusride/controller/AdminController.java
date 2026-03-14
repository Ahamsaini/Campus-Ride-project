package com.campusride.controller;

import com.campusride.entity.User;
import com.campusride.repository.UserRepository;
import com.campusride.service.LocationService;
import com.campusride.service.RideService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import com.campusride.dto.*;
import com.campusride.repository.*;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final UserRepository userRepository;
    private final RideService rideService;
    private final LocationService locationService;
    private final TripSessionRepository tripSessionRepository;
    private final com.campusride.repository.RideRepository rideRepository;
    private final UserFeedbackRepository feedbackRepository;
    private final SearchEngagementLogRepository searchLogRepository;

    @GetMapping("/search-heatmap")
    public ResponseEntity<List<Object[]>> getSearchHeatmap() {
        return ResponseEntity.ok(searchLogRepository.getSearchHeatmapData());
    }

    @Transactional(readOnly = true)
    @GetMapping("/trip-history")
    public ResponseEntity<List<TripHistoryDTO>> getTripHistory(
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer month,
            @RequestParam(required = false) Integer day,
            @RequestParam(required = false) String name) {

        LocalDateTime start;
        LocalDateTime end;

        if (year != null && month != null && day != null) {
            LocalDate date = LocalDate.of(year, month, day);
            start = date.atStartOfDay();
            end = date.atTime(LocalTime.MAX);
        } else if (year != null && month != null) {
            LocalDate date = LocalDate.of(year, month, 1);
            start = date.atStartOfDay();
            end = date.plusMonths(1).atStartOfDay().minusSeconds(1);
        } else if (year != null) {
            LocalDate date = LocalDate.of(year, 1, 1);
            start = date.atStartOfDay();
            end = date.plusYears(1).atStartOfDay().minusSeconds(1);
        } else {
            // Default: All-time. Use ranges safe for PostgreSQL (Postgres range: 4713 BC to
            // 294276 AD)
            start = LocalDateTime.of(2000, 1, 1, 0, 0);
            end = LocalDateTime.of(2100, 12, 31, 23, 59);
        }

        List<TripHistoryDTO> history = tripSessionRepository.findByStartedAtBetween(start, end)
                .stream()
                .filter(s -> {
                    if (name == null || name.isBlank())
                        return true;
                    String search = name.toLowerCase();
                    return s.getRider().getName().toLowerCase().contains(search) ||
                            s.getPassenger().getName().toLowerCase().contains(search);
                })
                .map(s -> TripHistoryDTO.builder()
                        .sessionId(s.getId())
                        .rideId(s.getRide().getId())
                        .riderName(s.getRider().getName())
                        .riderEmail(s.getRider().getEmail())
                        .passengerName(s.getPassenger().getName())
                        .passengerEmail(s.getPassenger().getEmail())
                        .pickupLat(s.getPickupLocation() != null ? s.getPickupLocation().getY() : null)
                        .pickupLng(s.getPickupLocation() != null ? s.getPickupLocation().getX() : null)
                        .startedAt(s.getStartedAt())
                        .endedAt(s.getEndedAt())
                        .status(s.getStatus().name())
                        .build())
                .collect(Collectors.toList());

        return ResponseEntity.ok(history);
    }

    @GetMapping("/ride-location/{rideId}")
    public ResponseEntity<String> getRideLocation(@PathVariable UUID rideId) {
        return ResponseEntity.ok(locationService.getLocation(rideId));
    }

    @GetMapping("/pending-verifications")
    public ResponseEntity<List<User>> getPendingVerifications() {
        return ResponseEntity.ok(userRepository.findByVerifiedFalse());
    }

    @PutMapping("/verify/{userId}")
    public ResponseEntity<Map<String, String>> verifyUser(@PathVariable UUID userId) {
        java.util.Objects.requireNonNull(userId, "userId cannot be null");
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        user.setVerified(true);
        userRepository.save(user);
        return ResponseEntity.ok(Map.of("message", "User verified successfully"));
    }

    @PutMapping("/block/{userId}")
    public ResponseEntity<Map<String, String>> blockUser(@PathVariable UUID userId) {
        java.util.Objects.requireNonNull(userId, "userId cannot be null");
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        user.setBlocked(true);
        userRepository.save(user);
        return ResponseEntity.ok(Map.of("message", "User blocked successfully"));
    }

    @PutMapping("/unblock/{userId}")
    public ResponseEntity<Map<String, String>> unblockUser(@PathVariable UUID userId) {
        java.util.Objects.requireNonNull(userId, "userId cannot be null");
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        user.setBlocked(false);
        userRepository.save(user);
        return ResponseEntity.ok(Map.of("message", "User unblocked successfully"));
    }

    @PutMapping("/users/{userId}/trust-score")
    public ResponseEntity<Map<String, String>> updateTrustScore(
            @PathVariable UUID userId,
            @RequestBody Map<String, Integer> body) {
        java.util.Objects.requireNonNull(userId, "userId cannot be null");
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        user.setTrustScore(body.get("trustScore"));
        userRepository.save(user);
        return ResponseEntity.ok(Map.of("message", "Trust score updated successfully"));
    }

    @Transactional(readOnly = true)
    @GetMapping("/reports")
    public ResponseEntity<List<ReportResponseDTO>> getReports() {
        return ResponseEntity.ok(feedbackRepository.findAllWithDetails().stream()
                .map(f -> ReportResponseDTO.builder()
                        .id(f.getId())
                        .fromUserName(f.getFromUser().getName())
                        .toUserName(f.getToUser().getName())
                        .pointImpact(f.getPointImpact())
                        .reportText(f.getReportText())
                        .createdAt(f.getCreatedAt())
                        .rideId(f.getRide().getId())
                        .build())
                .collect(Collectors.toList()));
    }

    @GetMapping("/users")
    public ResponseEntity<List<User>> getAllUsers() {
        return ResponseEntity.ok(userRepository.findAll());
    }

    @GetMapping("/active-rides")
    public ResponseEntity<List<Map<String, Object>>> getActiveRides() {
        List<Map<String, Object>> safeRides = rideService.getActiveRides().stream().map(r -> {
            return Map.<String, Object>of(
                    "id", r.getId(),
                    "startLat", r.getStartLat(),
                    "startLng", r.getStartLng(),
                    "rider", Map.of("name", r.getRiderName(), "trustScore",
                            userRepository.findById(java.util.Objects.requireNonNull(r.getRiderId()))
                                    .map(User::getTrustScore).orElse(120)));
        }).collect(Collectors.toList());
        return ResponseEntity.ok(safeRides);
    }

    @PutMapping("/force-end/{rideId}")
    public ResponseEntity<Map<String, String>> forceEndRide(@PathVariable UUID rideId) {
        rideService.forceCompleteRide(rideId);
        return ResponseEntity.ok(Map.of("message", "Ride ended by administrator"));
    }

    @Transactional(readOnly = true)
    @GetMapping("/rides-history")
    public ResponseEntity<List<RideHistoryDTO>> getRideHistory(
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer month,
            @RequestParam(required = false) Integer day,
            @RequestParam(required = false) String name) {

        return ResponseEntity.ok(rideRepository.findAll().stream()
                .filter(r -> {
                    if (year == null)
                        return true;
                    // Filter by Departure Time instead of CreatedAt for accurate daily history
                    LocalDateTime dt = r.getDepartureTime() != null ? r.getDepartureTime() : r.getCreatedAt();

                    boolean match = dt.getYear() == year;
                    if (match && month != null)
                        match = dt.getMonthValue() == month;
                    if (match && day != null)
                        match = dt.getDayOfMonth() == day;
                    return match;
                })
                .filter(r -> {
                    if (name == null || name.isBlank())
                        return true;
                    String search = name.toLowerCase();
                    boolean riderMatch = r.getRider().getName().toLowerCase().contains(search);
                    boolean passengerMatch = tripSessionRepository.findByRideId(r.getId()).stream()
                            .anyMatch(p -> p.getPassenger().getName().toLowerCase().contains(search));
                    return riderMatch || passengerMatch;
                })
                .map(rideService::convertToHistoryDTO)
                .collect(Collectors.toList()));
    }
}
