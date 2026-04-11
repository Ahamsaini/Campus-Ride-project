package com.campusride.service;

import com.campusride.dto.*;
import com.campusride.entity.*;
import com.campusride.enums.*;
import com.campusride.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.locationtech.jts.geom.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
public class RideService {

    private final RideRepository rideRepository;
    private final UserRepository userRepository;
    private final TripSessionRepository tripSessionRepository;
    private final SavedRouteRepository savedRouteRepository;
    private final SearchEngagementLogRepository searchLogRepository;
    private final LocationService locationService;
    private final SimpMessagingTemplate messagingTemplate;

    @Value("${app.ride.corridor-radius-meters}")
    private double corridorRadiusMeters;

    private static final GeometryFactory geometryFactory = new GeometryFactory(new PrecisionModel(), 4326);

    @Transactional
    public RideResponseDTO createRide(UUID riderId, CreateRideRequest request) {
        User rider = userRepository.findById(java.util.Objects.requireNonNull(riderId))
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        if (!Boolean.TRUE.equals(rider.getVerified())) {
            throw new IllegalStateException("Only verified users can create rides");
        }
        if (Boolean.TRUE.equals(rider.getBlocked())) {
            throw new IllegalStateException("Your account is blocked");
        }

        Point startPoint = geometryFactory.createPoint(
                new Coordinate(request.getStartLng(), request.getStartLat()));
        Point endPoint = geometryFactory.createPoint(
                new Coordinate(request.getEndLng(), request.getEndLat()));

        // Build LineString from route coordinates
        Coordinate[] coords = request.getRouteCoordinates().stream()
                .map(c -> new Coordinate(c[0], c[1])) // [lng, lat]
                .toArray(Coordinate[]::new);
        LineString routePath = geometryFactory.createLineString(coords);

        Ride ride = Ride.builder()
                .rider(rider)
                .startPoint(startPoint)
                .endPoint(endPoint)
                .routePath(routePath)
                .seatsAvailable(request.getSeatsAvailable())
                .departureTime(request.getDepartureTime())
                .pickupLocationName(request.getPickupLocationName())
                .dropoffLocationName(request.getDropoffLocationName())
                .route(request.getRouteId() != null 
                        ? savedRouteRepository.findById(java.util.Objects.requireNonNull(request.getRouteId())).orElse(null)
                        : null)
                .build();

        Ride saved = rideRepository.save(java.util.Objects.requireNonNull(ride));
        return convertToDTO(saved);
    }

    /**
     * Advanced BlaBlaCar Matching: Matches both Pickup and Dropoff points along the
     * driver's LineString.
     */
    @Transactional(readOnly = true)
    public List<RideResponseDTO> searchRides(UUID passengerId, double pLat, double pLng, double dLat, double dLng) {
        java.util.Objects.requireNonNull(passengerId, "passengerId cannot be null");
        User passenger = userRepository.findById(passengerId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        List<Object[]> results = rideRepository.findRidesByRouteOverlap(
                pLng, pLat, dLng, dLat, corridorRadiusMeters, passenger.getGender().name());

        List<RideResponseDTO> dtos = new ArrayList<>();

        for (Object[] row : results) {
            // Find the UUID manually
            UUID rideId = null;
            for (Object col : row) {
                if (col instanceof java.util.UUID) {
                    rideId = (UUID) col;
                    break;
                }
            }

            if (rideId == null) continue;

            Ride ride = rideRepository.findById(rideId).orElse(null);
            if (ride == null) continue;

            User rider = ride.getRider();
            // Expected columns from RideRepository: r.*, pickup_dist, p_pos, d_pos, segment_dist
            // Last 4 indexes: length-4, length-3, length-2, length-1
            double pickupDist = ((Number) row[row.length - 4]).doubleValue();
            double segmentDistMeters = ((Number) row[row.length - 1]).doubleValue();

            double segmentDistKm = segmentDistMeters / 1000.0;
            double fuelShare = segmentDistKm + Math.floor(segmentDistKm / 10.0) * 5.0;
            
            // Progress Check for Mid-Route Joins
            if (ride.getStatus() == RideStatus.IN_PROGRESS) {
                double[] riderCoords = locationService.getRiderCoordinates(rideId);
                if (riderCoords != null) {
                    Double pPos = ((Number) row[row.length - 3]).doubleValue(); // p_pos
                    Double riderProgress = rideRepository.calculatePointProgress(rideId, riderCoords[0], riderCoords[1]);
                    if (riderProgress != null && riderProgress >= pPos) {
                        log.info("Filtering out in-progress ride {} - Rider already passed pickup point (Progress: {}, Pickup: {})", rideId, riderProgress, pPos);
                        continue;
                    }
                }
            }

            double matchScore = computeMatchScore(passenger, rider);

            double dropoffDist = 0;
            try {
                org.locationtech.jts.geom.Point dropoffPt = geometryFactory.createPoint(
                        new Coordinate(dLng, dLat));
                dropoffDist = ride.getRoutePath().distance(dropoffPt) * 111320; 
            } catch (Exception ignored) {}

            Coordinate[] routeCoords = ride.getRoutePath().getCoordinates();
            List<double[]> routeCoordsList = new ArrayList<>();
            for (Coordinate c : routeCoords) {
                routeCoordsList.add(new double[] { c.getY(), c.getX() });
            }

            String vehicleType = null;
            String plateNumber = null;
            if (ride.getVehicle() != null) {
                vehicleType = ride.getVehicle().getType().name();
                plateNumber = ride.getVehicle().getPlateNumber();
            }

            dtos.add(RideResponseDTO.builder()
                    .id(rideId)
                    .riderId(rider.getId())
                    .riderName(rider.getName())
                    .riderDept(rider.getDepartment())
                    .riderCourse(rider.getCourse())
                    .riderYear(rider.getYear())
                    .pickupLocationName(ride.getPickupLocationName() != null ? ride.getPickupLocationName() : (ride.getRoute() != null ? ride.getRoute().getName().split(" to ")[0] : "Starting Point"))
                    .dropoffLocationName(ride.getDropoffLocationName() != null ? ride.getDropoffLocationName() : (ride.getRoute() != null && ride.getRoute().getName().contains(" to ") ? ride.getRoute().getName().split(" to ")[1] : "Campus Destination"))
                    .startLat(ride.getStartPoint().getY())
                    .startLng(ride.getStartPoint().getX())
                    .endLat(ride.getEndPoint().getY())
                    .endLng(ride.getEndPoint().getX())
                    .routeCoordinates(routeCoordsList)
                    .seatsAvailable(ride.getSeatsAvailable() != null ? ride.getSeatsAvailable() : 0)
                    .vehicleType(vehicleType)
                    .plateNumber(plateNumber)
                    .departureTime(ride.getDepartureTime())
                    .status(ride.getStatus().name())
                    .matchScore(matchScore)
                    .distanceFromRoute(Math.round(pickupDist * 100.0) / 100.0)
                    .dropoffDistFromRoute(Math.round(dropoffDist * 100.0) / 100.0)
                    .emergencyActive(Boolean.TRUE.equals(ride.getEmergencyActive()))
                    .estimatedContribution(Math.round(fuelShare * 100.0) / 100.0)
                    .riderTrustScore(rider.getTrustScore())
                    .build());
        }

        dtos.sort(Comparator
                .comparingDouble(RideResponseDTO::getMatchScore).reversed()
                .thenComparingDouble(RideResponseDTO::getDistanceFromRoute));

        if (dtos.isEmpty()) {
            logSearchEngagement(passengerId, pLat, pLng, dLat, dLng, false, 0);
        } else {
            logSearchEngagement(passengerId, pLat, pLng, dLat, dLng, true, dtos.size());
        }

        return dtos;
    }

    private void logSearchEngagement(UUID passengerId, double pLat, double pLng, double dLat, double dLng,
            boolean found, int count) {
        try {
            GeometryFactory factory = new GeometryFactory(new PrecisionModel(), 4326);
            SearchEngagementLog logModel = SearchEngagementLog.builder()
                    .passengerId(passengerId)
                    .pickupLocation(factory.createPoint(new Coordinate(pLng, pLat)))
                    .dropoffLocation(factory.createPoint(new Coordinate(dLng, dLat)))
                    .resultsFound(found)
                    .resultCount(count)
                    .build();
            searchLogRepository.save(java.util.Objects.requireNonNull(logModel));
        } catch (Exception e) {
            log.error("Failed to log search engagement", e);
        }
    }

    private double computeMatchScore(User passenger, User rider) {
        double score = 0.0;
        if (passenger.getDepartment().equalsIgnoreCase(rider.getDepartment())) {
            score += 0.5;
        }
        if (passenger.getCourse().equalsIgnoreCase(rider.getCourse())) {
            score += 0.3;
        }
        if (Objects.equals(passenger.getYear(), rider.getYear())) {
            score += 0.2;
        }
        return score;
    }

    @Transactional(readOnly = true)
    public List<RideResponseDTO> getMyRides(UUID riderId) {
        List<Ride> rides = rideRepository.findByRiderId(java.util.Objects.requireNonNull(riderId));
        return rides.stream().map(this::convertToDTO).toList();
    }

    @Transactional
    public RideResponseDTO cancelRide(UUID rideId, UUID riderId) {
        Ride ride = rideRepository.findById(java.util.Objects.requireNonNull(rideId))
                .orElseThrow(() -> new IllegalArgumentException("Ride not found"));
        if (!ride.getRider().getId().equals(riderId)) {
            throw new IllegalArgumentException("You can only update your own rides");
        }
        ride.setStatus(RideStatus.CANCELLED);
        locationService.removeLocation(rideId);
        Ride saved = rideRepository.save(ride);
        broadcastStatusUpdate(saved);
        return convertToDTO(saved);
    }

    @Transactional
    public RideResponseDTO startRide(UUID rideId, UUID riderId) {
        Ride ride = rideRepository.findById(java.util.Objects.requireNonNull(rideId))
                .orElseThrow(() -> new IllegalArgumentException("Ride not found"));
        if (!ride.getRider().getId().equals(riderId)) {
            throw new IllegalArgumentException("You can only start your own rides");
        }
        ride.setStatus(RideStatus.IN_PROGRESS);
        Ride saved = rideRepository.save(ride);
        broadcastStatusUpdate(saved);
        return convertToDTO(saved);
    }

    @Transactional
    public RideResponseDTO completeRide(UUID rideId, UUID riderId) {
        Ride ride = rideRepository.findById(java.util.Objects.requireNonNull(rideId))
                .orElseThrow(() -> new IllegalArgumentException("Ride not found"));
        if (ride.getRider() == null || !ride.getRider().getId().equals(riderId)) {
            throw new IllegalArgumentException("You can only complete your own rides");
        }
        return forceCompleteRide(rideId);
    }

    @Transactional
    public RideResponseDTO forceCompleteRide(UUID rideId) {
        try {
            Ride ride = rideRepository.findById(java.util.Objects.requireNonNull(rideId))
                    .orElseThrow(() -> new IllegalArgumentException("Ride not found"));
            
            log.info("Completing ride: {}", rideId);
            ride.setStatus(RideStatus.COMPLETED);
            ride.setEmergencyActive(false);

            if (ride.getRoute() != null) {
                SavedRoute route = ride.getRoute();
                int currentCount = (route.getUsageCount() != null) ? route.getUsageCount() : 0;
                route.setUsageCount(currentCount + 1);
                savedRouteRepository.save(route);
            }

            List<TripSession> sessions = tripSessionRepository.findByRideId(rideId);
            for (TripSession session : sessions) {
                if (session.getStatus() == TripStatus.ACTIVE || session.getStatus() == TripStatus.EMERGENCY) {
                    session.setStatus(TripStatus.COMPLETED);
                    session.setEndedAt(LocalDateTime.now());
                    tripSessionRepository.save(session);
                }
            }

            Ride saved = rideRepository.save(ride);
            locationService.removeLocation(rideId);
            try {
                updateUserStats(ride);
            } catch (Exception e) {
                log.error("Failed to update user stats for ride {}: {}", ride.getId(), e.getMessage());
            }
            broadcastStatusUpdate(saved);
            return convertToDTO(saved);
        } catch (Exception e) {
            log.error("Critical error in forceCompleteRide for {}: {}", rideId, e.getMessage(), e);
            throw e;
        }
    }

    private void updateUserStats(Ride ride) {
        double distanceKm = 0.0;
        if (ride.getRoutePath() != null) {
            distanceKm = ride.getRoutePath().getLength() * 111.0;
        }

        User rider = ride.getRider();
        int currentRides = (rider.getTotalRides() != null) ? rider.getTotalRides() : 0;
        double currentDistance = (rider.getTotalDistance() != null) ? rider.getTotalDistance() : 0.0;
        
        rider.setTotalRides(currentRides + 1);
        rider.setTotalDistance(currentDistance + distanceKm);
        userRepository.save(rider);

        List<TripSession> participants = tripSessionRepository.findByRideId(ride.getId());
        for (TripSession session : participants) {
            User passenger = session.getPassenger();
            if (passenger == null) continue;
            
            int pRides = (passenger.getTotalRides() != null) ? passenger.getTotalRides() : 0;
            double pDist = (passenger.getTotalDistance() != null) ? passenger.getTotalDistance() : 0.0;
            
            passenger.setTotalRides(pRides + 1);
            passenger.setTotalDistance(pDist + distanceKm);
            userRepository.save(passenger);
        }
    }

    @Transactional(readOnly = true)
    public List<RideResponseDTO> getActiveRides() {
        List<Ride> rides = rideRepository.findByStatusIn(List.of(RideStatus.OPEN, RideStatus.IN_PROGRESS));
        return rides.stream().map(this::convertToDTO).toList();
    }

    @Transactional(readOnly = true)
    public List<RideHistoryDTO> getUserTripHistory(UUID userId, Integer year, Integer month, Integer day) {
        List<TripSession> sessions = tripSessionRepository.findByRiderIdOrPassengerId(userId, userId);
        Map<UUID, Ride> ridesMap = sessions.stream()
                .map(TripSession::getRide)
                .filter(r -> {
                    if (year == null) return true;
                    LocalDateTime dt = r.getCreatedAt();
                    boolean match = dt.getYear() == year;
                    if (match && month != null) match = dt.getMonthValue() == month;
                    if (match && day != null) match = dt.getDayOfMonth() == day;
                    return match;
                })
                .collect(Collectors.toMap(Ride::getId, r -> r, (r1, r2) -> r1));

        return ridesMap.values().stream()
                .map(this::convertToHistoryDTO)
                .sorted(Comparator.comparing(RideHistoryDTO::getStartTime).reversed())
                .collect(Collectors.toList());
    }

    public RideHistoryDTO convertToHistoryDTO(Ride ride) {
        List<TripSession> participants = tripSessionRepository.findByRideId(ride.getId());
        List<double[]> path = new ArrayList<>();
        for (Coordinate c : ride.getRoutePath().getCoordinates()) {
            path.add(new double[] { c.getY(), c.getX() });
        }

        return RideHistoryDTO.builder()
                .rideId(ride.getId())
                .riderName(ride.getRider().getName())
                .departurePoint("Lat: " + ride.getStartPoint().getY() + ", Lng: " + ride.getStartPoint().getX())
                .destinationPoint("Lat: " + ride.getEndPoint().getY() + ", Lng: " + ride.getEndPoint().getX())
                .startTime(ride.getDepartureTime() != null ? ride.getDepartureTime() : ride.getCreatedAt())
                .endTime(ride.getStatus() == RideStatus.COMPLETED ? LocalDateTime.now() : null)
                .status(ride.getStatus().name())
                .passengerNames(participants.stream().map(p -> p.getPassenger().getName()).distinct().toList())
                .routePath(path)
                .build();
    }

    @Transactional(readOnly = true)
    public RideResponseDTO getActiveSession(UUID userId) {
        List<Ride> activeRides = rideRepository.findActiveRidesForUser(
                userId,
                Arrays.asList(RideStatus.OPEN, RideStatus.IN_PROGRESS),
                TripStatus.ACTIVE);
        if (activeRides != null && !activeRides.isEmpty()) {
            return convertToDTO(activeRides.get(0));
        }
        return null;
    }

    @Transactional(readOnly = true)
    public RideResponseDTO getRideById(UUID rideId) {
        Ride ride = rideRepository.findById(java.util.Objects.requireNonNull(rideId))
                .orElseThrow(() -> new IllegalArgumentException("Ride not found"));
        return convertToDTO(ride);
    }

    private Double calculateEstimatedContribution(Ride ride) {
        if (ride.getRoutePath() == null) return 0.0;
        double distanceKm = ride.getRoutePath().getLength() * 111.0;
        double fuelShare = distanceKm + Math.floor(distanceKm / 10.0) * 5.0;
        return Math.round(fuelShare * 100.0) / 100.0;
    }

    @Transactional
    public RideResponseDTO toggleSharing(UUID rideId, UUID userId, boolean active) {
        Ride ride = rideRepository.findById(java.util.Objects.requireNonNull(rideId))
                .orElseThrow(() -> new IllegalArgumentException("Ride not found"));
        if (!ride.getRider().getId().equals(userId)) {
            throw new IllegalStateException("Only the rider can toggle sharing");
        }
        ride.setSharingActive(active);
        if (active && (ride.getTrackingToken() == null || ride.getTrackingToken().isEmpty())) {
            ride.setTrackingToken(UUID.randomUUID().toString().substring(0, 8));
        }
        return convertToDTO(rideRepository.save(ride));
    }

    @Transactional(readOnly = true)
    public PublicRideDTO getPublicRide(String token) {
        Ride ride = rideRepository.findByTrackingToken(token)
                .orElseThrow(() -> new IllegalArgumentException("Tracking link invalid or expired"));

        if (!Boolean.TRUE.equals(ride.getSharingActive())) {
            throw new IllegalStateException("This journey is no longer being shared");
        }

        List<double[]> routeCoordsList = new ArrayList<>();
        if (ride.getRoutePath() != null) {
            for (Coordinate coord : ride.getRoutePath().getCoordinates()) {
                routeCoordsList.add(new double[] { coord.getY(), coord.getX() });
            }
        }

        return PublicRideDTO.builder()
                .riderFirstName(ride.getRider().getName().split(" ")[0])
                .vehicleType(ride.getVehicle() != null ? ride.getVehicle().getType().name() : "Vehicle")
                .currentLat(ride.getStartPoint().getY())
                .currentLng(ride.getStartPoint().getX())
                .routeCoordinates(routeCoordsList)
                .status(ride.getStatus().name())
                .build();
    }

    public RideResponseDTO convertToDTO(Ride ride) {
        if (ride == null) return null;

        List<double[]> routeCoordsList = new ArrayList<>();
        if (ride.getRoutePath() != null) {
            Coordinate[] routeCoords = ride.getRoutePath().getCoordinates();
            for (Coordinate c : routeCoords) {
                routeCoordsList.add(new double[] { c.getY(), c.getX() });
            }
        }

        String vehicleType = null;
        String plateNumber = null;
        if (ride.getVehicle() != null) {
            vehicleType = ride.getVehicle().getType().name();
            plateNumber = ride.getVehicle().getPlateNumber();
        }

        User rider = ride.getRider();
        java.util.Objects.requireNonNull(rider, "Rider cannot be null");

        if (ride.getStatus() != null && "EMERGENCY".equals(ride.getStatus().name())) {
            ride.setStatus(RideStatus.IN_PROGRESS);
            ride.setEmergencyActive(true);
        }

        String statusStr = (ride.getStatus() != null) ? ride.getStatus().name() : "UNKNOWN";

        return RideResponseDTO.builder()
                .id(ride.getId())
                .riderId(rider.getId())
                .riderName(rider.getName())
                .riderDept(rider.getDepartment())
                .riderCourse(rider.getCourse())
                .riderYear(rider.getYear())
                .pickupLocationName(ride.getPickupLocationName() != null ? ride.getPickupLocationName() : (ride.getRoute() != null && ride.getRoute().getName() != null ? ride.getRoute().getName().split(" to ")[0] : "Campus Pickup"))
                .dropoffLocationName(ride.getDropoffLocationName() != null ? ride.getDropoffLocationName() : (ride.getRoute() != null && ride.getRoute().getName() != null && ride.getRoute().getName().contains(" to ") ? ride.getRoute().getName().split(" to ")[1].trim() : "Campus Dropoff"))
                .startLat(ride.getStartPoint() != null ? ride.getStartPoint().getY() : 0.0)
                .startLng(ride.getStartPoint() != null ? ride.getStartPoint().getX() : 0.0)
                .endLat(ride.getEndPoint() != null ? ride.getEndPoint().getY() : 0.0)
                .endLng(ride.getEndPoint() != null ? ride.getEndPoint().getX() : 0.0)
                .routeCoordinates(routeCoordsList)
                .seatsAvailable(ride.getSeatsAvailable() != null ? ride.getSeatsAvailable() : 0)
                .vehicleType(vehicleType)
                .plateNumber(plateNumber)
                .departureTime(ride.getDepartureTime())
                .status(statusStr)
                .matchScore(0.0)
                .distanceFromRoute(0.0)
                .dropoffDistFromRoute(0.0)
                .emergencyActive(Boolean.TRUE.equals(ride.getEmergencyActive()))
                .estimatedContribution(calculateEstimatedContribution(ride))
                .trackingToken(ride.getTrackingToken())
                .sharingActive(Boolean.TRUE.equals(ride.getSharingActive()))
                .riderTrustScore(rider.getTrustScore())
                .build();
    }

    private void broadcastStatusUpdate(Ride ride) {
        if (messagingTemplate != null) {
            Map<String, Object> payload = new HashMap<>();
            payload.put("rideId", ride.getId());
            payload.put("status", ride.getStatus().name());
            payload.put("timestamp", LocalDateTime.now().toString());
            messagingTemplate.convertAndSend("/topic/ride/" + ride.getId() + "/status", payload);
        }
    }
}
