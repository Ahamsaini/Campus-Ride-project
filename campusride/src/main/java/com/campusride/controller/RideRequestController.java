package com.campusride.controller;

import com.campusride.dto.RideRequestDTO;
import com.campusride.dto.RideRequestResponseDTO;
import com.campusride.service.RideRequestService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/ride-requests")
@RequiredArgsConstructor
public class RideRequestController {

    private final RideRequestService rideRequestService;

    @PostMapping
    public ResponseEntity<RideRequestResponseDTO> sendRequest(
            @AuthenticationPrincipal UUID userId,
            @Valid @RequestBody RideRequestDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(rideRequestService.sendRequest(
                userId, dto.getRideId(), dto.getPickupLat(), dto.getPickupLng(),
                dto.getDropoffLat(), dto.getDropoffLng()));
    }

    @PutMapping("/{requestId}/rider-accept")
    public ResponseEntity<RideRequestResponseDTO> riderAccept(
            @AuthenticationPrincipal UUID userId,
            @PathVariable UUID requestId) {
        return ResponseEntity.ok(rideRequestService.riderAccept(requestId, userId));
    }

    @PutMapping("/{requestId}/passenger-confirm")
    public ResponseEntity<RideRequestResponseDTO> passengerConfirm(
            @AuthenticationPrincipal UUID userId,
            @PathVariable UUID requestId) {
        return ResponseEntity.ok(rideRequestService.passengerConfirm(requestId, userId));
    }

    @PutMapping("/{requestId}/reject")
    public ResponseEntity<RideRequestResponseDTO> reject(
            @AuthenticationPrincipal UUID userId,
            @PathVariable UUID requestId) {
        return ResponseEntity.ok(rideRequestService.rejectRequest(requestId, userId));
    }

    @PutMapping("/{requestId}/expire")
    public ResponseEntity<RideRequestResponseDTO> expire(@PathVariable UUID requestId) {
        return ResponseEntity.ok(rideRequestService.expireRequest(requestId));
    }

    @PutMapping("/ride/{rideId}/complete")
    public ResponseEntity<Void> completePassengerSession(
            @AuthenticationPrincipal UUID userId,
            @PathVariable UUID rideId) {
        rideRequestService.completePassengerSession(rideId, userId);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/ride/{rideId}")
    public ResponseEntity<List<RideRequestResponseDTO>> getRequestsForRide(@PathVariable UUID rideId) {
        return ResponseEntity.ok(rideRequestService.getRequestsForRide(rideId));
    }

    @GetMapping("/my-requests")
    public ResponseEntity<List<RideRequestResponseDTO>> getMyRequests(@AuthenticationPrincipal UUID userId) {
        return ResponseEntity.ok(rideRequestService.getMyRequests(userId));
    }
}
