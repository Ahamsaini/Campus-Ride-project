package com.campusride.controller;

import com.campusride.service.LocationService;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.util.Map;
import java.util.UUID;

@Controller
@RequiredArgsConstructor
public class LocationController {

    private final LocationService locationService;
    private final SimpMessagingTemplate messagingTemplate;

    /**
     * Rider pushes coordinates: /app/ride/location
     * Payload: { "rideId": "...", "lat": 29.96, "lng": 77.55 }
     */
    @MessageMapping("/ride/location")
    public void updateLocation(Map<String, Object> payload) {
        Object rideIdObj = payload.get("rideId");
        if (rideIdObj == null || payload.get("lat") == null || payload.get("lng") == null) {
            return;
        }

        UUID rideId = UUID.fromString(rideIdObj.toString());
        double lat = ((Number) payload.get("lat")).doubleValue();
        double lng = ((Number) payload.get("lng")).doubleValue();

        // Store rider location in Redis
        if ("RIDER".equals(payload.get("role"))) {
            locationService.saveLocation(rideId, lat, lng);
        }

        // Broadcast to /topic/ride/{rideId}
        messagingTemplate.convertAndSend("/topic/ride/" + rideId, payload);
    }
}
