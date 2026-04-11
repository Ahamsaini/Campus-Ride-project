package com.campusride.service;

import com.campusride.dto.SOSNotification;
import com.campusride.entity.Ride;
import com.campusride.entity.TripSession;
import com.campusride.entity.User;
import com.campusride.enums.TripStatus;
import com.campusride.repository.RideRepository;
import com.campusride.repository.TripSessionRepository;
import com.campusride.repository.UserRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SOSService {

    private final RideRepository rideRepository;
    private final TripSessionRepository tripSessionRepository;
    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final LocationService locationService;
    private final ObjectMapper objectMapper;

    @Transactional
    public void triggerSOS(UUID rideId, UUID userId) {
        System.out.println("Processing SOS for rideId: " + rideId + " triggered by userId: " + userId);

        Ride ride = rideRepository.findById(java.util.Objects.requireNonNull(rideId))
                .orElseThrow(() -> {
                    System.err.println("SOS Failed: Ride not found for ID " + rideId);
                    return new IllegalArgumentException("Ride not found");
                });

        User triggeringUser = userRepository.findById(java.util.Objects.requireNonNull(userId))
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        // Mark ride as emergency using boolean flag to avoid check constraint issues
        ride.setEmergencyActive(true);
        rideRepository.save(ride);
        System.out.println("Ride " + rideId + " flag emergencyActive set to true");

        // Mark all active sessions for this ride as emergency
        List<TripSession> sessions = tripSessionRepository.findByRideId(rideId);
        System.out.println("Found " + sessions.size() + " sessions for ride " + rideId);

        for (TripSession session : sessions) {
            if (session.getStatus() == TripStatus.ACTIVE) {
                session.setStatus(TripStatus.EMERGENCY);
                tripSessionRepository.save(session);
                System.out.println("Session " + session.getId() + " status set to EMERGENCY");
            }
        }

        // Get last known location
        Double lat = null;
        Double lng = null;
        try {
            String json = locationService.getLocation(rideId);
            if (json != null && !json.isEmpty()) {
                JsonNode node = objectMapper.readTree(json);
                if (node.has("lat") && node.has("lng")) {
                    lat = node.get("lat").asDouble();
                    lng = node.get("lng").asDouble();
                }
            }
        } catch (Exception e) {
            System.err.println("SOS location lookup error: " + e.getMessage());
        }

        // Safely collect passenger names
        String passengerNames = sessions.stream()
                .filter(s -> s.getPassenger() != null)
                .map(s -> s.getPassenger().getName())
                .collect(Collectors.joining(", "));

        if (passengerNames.isEmpty())
            passengerNames = "None joined";

        java.util.List<java.util.Map<String, Object>> nearbyRidesData = new java.util.ArrayList<>();
        if (lat != null && lng != null) {
            List<UUID> nearbyRideIds = locationService.findNearbyRides(lat, lng, 5.0); // 5km radius

            for (UUID nearRideId : nearbyRideIds) {
                if (nearRideId.equals(rideId))
                    continue; // Skip the ride that triggered SOS

                // Get all users in the nearby ride
                List<TripSession> nearSessions = tripSessionRepository.findByRideId(nearRideId);
                Ride nearRide = rideRepository.findById(nearRideId).orElse(null);

                java.util.Set<UUID> userIdsToNotify = new java.util.HashSet<>();
                if (nearRide != null) {
                    userIdsToNotify.add(nearRide.getRider().getId());
                    java.util.Map<String, Object> rideData = new java.util.HashMap<>();
                    rideData.put("rideId", nearRide.getId().toString());
                    rideData.put("riderName", nearRide.getRider().getName());
                    rideData.put("vehicle",
                            nearRide.getVehicle() != null ? nearRide.getVehicle().getPlateNumber() : "Unknown");
                    nearbyRidesData.add(rideData);
                }

                for (TripSession s : nearSessions) {
                    if (s.getStatus() == TripStatus.ACTIVE && s.getPassenger() != null) {
                        userIdsToNotify.add(s.getPassenger().getId());
                    }
                }

                // Prepare a simplified alert for peers
                Map<String, Object> proximityAlert = Map.of(
                        "type", "PEER_SOS",
                        "rideId", rideId,
                        "distance", "within 5km",
                        "message", "🚨 Emergency detected nearby. Please stay vigilant.");

                for (UUID uid : userIdsToNotify) {
                    if (uid != null) {
                        messagingTemplate.convertAndSend("/topic/notifications/" + uid, proximityAlert);
                    }
                }
            }
        }

        SOSNotification notification = SOSNotification.builder()
                .tripId(rideId)
                .riderName(ride.getRider() != null ? ride.getRider().getName() : "Unknown Rider")
                .passengerName(passengerNames)
                .lastLat(lat)
                .lastLng(lng)
                .timestamp(LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME))
                .nearbyRides(nearbyRidesData)
                .build();

        // 1. Notify Admins
        if (notification != null) {
            messagingTemplate.convertAndSend("/topic/admin/sos", notification);
            // 2. Notify all participants on the live tracking screen
            messagingTemplate.convertAndSend("/topic/ride/" + rideId + "/sos", notification);
        }

        System.out.println("🚨 SOS Broadcast completed for Ride " + rideId + " by " + triggeringUser.getName());
    }

    @Transactional
    public void resolveSOS(UUID rideId) {
        Ride ride = rideRepository.findById(java.util.Objects.requireNonNull(rideId))
                .orElseThrow(() -> new IllegalArgumentException("Ride not found"));

        ride.setEmergencyActive(false);
        rideRepository.save(ride);

        List<TripSession> sessions = tripSessionRepository.findByRideId(rideId);
        for (TripSession session : sessions) {
            if (session.getStatus() == TripStatus.EMERGENCY) {
                session.setStatus(TripStatus.ACTIVE);
                tripSessionRepository.save(session);
            }
        }

        // Notify that SOS is resolved
        Map<String, Object> resolution = Map.of(
                "tripId", rideId,
                "resolved", true,
                "timestamp", LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME));

        if (resolution != null) {
            messagingTemplate.convertAndSend("/topic/admin/sos/resolved", resolution);
            messagingTemplate.convertAndSend("/topic/ride/" + rideId + "/sos/resolved", resolution);
        }

        System.out.println("✅ SOS Resolved for Ride " + rideId);
    }
}
