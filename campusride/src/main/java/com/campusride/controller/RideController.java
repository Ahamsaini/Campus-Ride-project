package com.campusride.controller;

import com.campusride.dto.*;
import com.campusride.service.RideService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/rides")
@RequiredArgsConstructor
public class RideController {

    private final RideService rideService;

    @GetMapping("/active-session")
    public ResponseEntity<RideResponseDTO> getActiveSession(@AuthenticationPrincipal UUID userId) {
        RideResponseDTO active = rideService.getActiveSession(userId);
        if (active == null) return ResponseEntity.noContent().build();
        return ResponseEntity.ok(active);
    }

    @PostMapping
    public ResponseEntity<RideResponseDTO> createRide(
            @AuthenticationPrincipal UUID userId,
            @Valid @RequestBody CreateRideRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(rideService.createRide(userId, request));
    }

    /**
     * BlaBlaCar-style double-point corridor search.
     * Passenger provides their pickup AND dropoff coordinates.
     * Returns rides whose route passes within the corridor of BOTH points,
     * and where pickup comes before dropoff along the route direction.
     */
    @GetMapping("/search")
    public ResponseEntity<List<RideResponseDTO>> searchRides(
            @AuthenticationPrincipal UUID userId,
            @RequestParam double pLat,
            @RequestParam double pLng,
            @RequestParam double dLat,
            @RequestParam double dLng) {
        return ResponseEntity.ok(rideService.searchRides(userId, pLat, pLng, dLat, dLng));
    }

    @GetMapping("/my-rides")
    public ResponseEntity<List<RideResponseDTO>> getMyRides(@AuthenticationPrincipal UUID userId) {
        return ResponseEntity.ok(rideService.getMyRides(userId));
    }

    @GetMapping("/history")
    public ResponseEntity<List<RideHistoryDTO>> getHistory(
            @AuthenticationPrincipal UUID userId,
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer month,
            @RequestParam(required = false) Integer day) {
        return ResponseEntity.ok(rideService.getUserTripHistory(userId, year, month, day));
    }

    @PutMapping("/{rideId}/start")
    public ResponseEntity<RideResponseDTO> startRide(
            @AuthenticationPrincipal UUID userId,
            @PathVariable UUID rideId) {
        return ResponseEntity.ok(rideService.startRide(rideId, userId));
    }

    @PutMapping("/{rideId}/complete")
    public ResponseEntity<RideResponseDTO> completeRide(
            @AuthenticationPrincipal UUID userId,
            @PathVariable UUID rideId) {
        return ResponseEntity.ok(rideService.completeRide(rideId, userId));
    }

    @PutMapping("/{rideId}/cancel")
    public ResponseEntity<RideResponseDTO> cancelRide(
            @AuthenticationPrincipal UUID userId,
            @PathVariable UUID rideId) {
        return ResponseEntity.ok(rideService.cancelRide(rideId, userId));
    }

    @PutMapping("/{rideId}/share")
    public ResponseEntity<RideResponseDTO> toggleSharing(
            @AuthenticationPrincipal UUID userId,
            @PathVariable UUID rideId,
            @RequestParam boolean active) {
        return ResponseEntity.ok(rideService.toggleSharing(rideId, userId, active));
    }

    @GetMapping("/{rideId}")
    public ResponseEntity<RideResponseDTO> getRide(@PathVariable UUID rideId) {
        return ResponseEntity.ok(rideService.getRideById(rideId));
    }
}
