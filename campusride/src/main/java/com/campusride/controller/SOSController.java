package com.campusride.controller;

import com.campusride.service.SOSService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/trip/sos")
@RequiredArgsConstructor
public class SOSController {

    private final SOSService sosService;

    @PostMapping("/{rideId}")
    public ResponseEntity<?> triggerSOS(
            @PathVariable UUID rideId,
            @AuthenticationPrincipal UUID userId) {
        sosService.triggerSOS(rideId, userId);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{rideId}/resolve")
    public ResponseEntity<?> resolveSOS(@PathVariable UUID rideId) {
        sosService.resolveSOS(rideId);
        return ResponseEntity.ok().build();
    }
}
