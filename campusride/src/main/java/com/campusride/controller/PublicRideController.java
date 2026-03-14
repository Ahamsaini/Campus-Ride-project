package com.campusride.controller;

import com.campusride.dto.PublicRideDTO;
import com.campusride.service.RideService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/public")
@RequiredArgsConstructor
public class PublicRideController {

    private final RideService rideService;

    @GetMapping("/track/{token}")
    public ResponseEntity<PublicRideDTO> trackRide(@PathVariable String token) {
        return ResponseEntity.ok(rideService.getPublicRide(token));
    }
}
