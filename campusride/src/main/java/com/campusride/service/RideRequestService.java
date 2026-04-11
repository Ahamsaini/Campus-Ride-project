package com.campusride.service;

import com.campusride.dto.RideRequestResponseDTO;
import com.campusride.entity.*;
import com.campusride.enums.*;
import com.campusride.repository.*;
import lombok.RequiredArgsConstructor;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.Point;
import org.locationtech.jts.geom.PrecisionModel;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class RideRequestService {

    private final RideRequestRepository rideRequestRepository;
    private final RideRepository rideRepository;
    private final UserRepository userRepository;
    private final TripSessionRepository tripSessionRepository;
    private final org.springframework.messaging.simp.SimpMessagingTemplate messagingTemplate;
    private final ChatService chatService;

    private static final GeometryFactory geometryFactory = new GeometryFactory(new PrecisionModel(), 4326);

    /**
     * Passenger sends a join request with their pickup location.
     */
    @Transactional
    public RideRequestResponseDTO sendRequest(UUID passengerId, UUID rideId, double pickupLat, double pickupLng,
            Double dropoffLat, Double dropoffLng) {
        // Only block if there's an active (PENDING or ACCEPTED) request
        if (rideRequestRepository.existsByRideIdAndPassengerIdAndStatusIn(rideId, passengerId, 
                List.of(RequestStatus.PENDING, RequestStatus.ACCEPTED))) {
            throw new IllegalStateException("You already have an active or accepted request for this ride. Please wait for the rider to respond.");
        }

        Ride ride = rideRepository.findById(rideId)
                .orElseThrow(() -> new IllegalArgumentException("Ride not found"));

        // Allow both OPEN and IN_PROGRESS rides
        if (ride.getStatus() != RideStatus.OPEN && ride.getStatus() != RideStatus.IN_PROGRESS) {
            throw new IllegalStateException("This ride is no longer available for join requests. Status: " + ride.getStatus());
        }
        if (ride.getSeatsAvailable() <= 0) {
            throw new IllegalStateException("This ride is already full (no seats available)");
        }
        if (ride.getRider().getId().equals(passengerId)) {
            throw new IllegalArgumentException("You cannot request your own ride");
        }

        User passenger = userRepository.findById(passengerId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        Point pickupLocation = geometryFactory.createPoint(new Coordinate(pickupLng, pickupLat));

        RideRequest.RideRequestBuilder builder = RideRequest.builder()
                .ride(ride)
                .passenger(passenger)
                .pickupLocation(pickupLocation);

        if (dropoffLat != null && dropoffLng != null) {
            Point dropoffLocation = geometryFactory.createPoint(new Coordinate(dropoffLng, dropoffLat));
            builder.dropoffLocation(dropoffLocation);
        }

        RideRequest saved = rideRequestRepository.save(java.util.Objects.requireNonNull(builder.build()));
        RideRequestResponseDTO dto = convertToDTO(saved);

        if (dto != null) {
            // Notify Rider via WebSocket
            messagingTemplate.convertAndSend("/topic/ride/" + rideId + "/requests", dto);
        }

        return dto;
    }

    /**
     * Rider accepts a passenger's request.
     */
    @Transactional
    public RideRequestResponseDTO riderAccept(UUID requestId, UUID riderId) {
        RideRequest request = rideRequestRepository.findById(java.util.Objects.requireNonNull(requestId))
                .orElseThrow(() -> new IllegalArgumentException("Request not found"));

        if (!request.getRide().getRider().getId().equals(java.util.Objects.requireNonNull(riderId))) {
            throw new IllegalArgumentException("Only the ride owner can accept requests");
        }

        request.setRiderAccepted(true);
        request.setStatus(RequestStatus.ACCEPTED);
        rideRequestRepository.save(request);

        // Check if both sides have accepted
        tryCreateTripSession(request);

        return convertToDTO(request);
    }

    /**
     * Passenger confirms acceptance (two-way handshake).
     */
    @Transactional
    public RideRequestResponseDTO passengerConfirm(UUID requestId, UUID passengerId) {
        RideRequest request = rideRequestRepository.findById(java.util.Objects.requireNonNull(requestId))
                .orElseThrow(() -> new IllegalArgumentException("Request not found"));

        if (!request.getPassenger().getId().equals(passengerId)) {
            throw new IllegalArgumentException("Only the passenger can confirm");
        }

        request.setPassengerAccepted(true);
        rideRequestRepository.save(request);

        // Check if both sides have accepted
        tryCreateTripSession(request);

        RideRequestResponseDTO dto = convertToDTO(request);

        // If it's a mid-route join, notify the Rider so they can see the new marker immediately
        if (request.getRide() != null && request.getRide().getStatus() == RideStatus.IN_PROGRESS && dto != null) {
            messagingTemplate.convertAndSend("/topic/ride/" + request.getRide().getId() + "/status", dto);
        }

        return dto;
    }

    /**
     * Rider rejects a request.
     */
    @Transactional
    public RideRequestResponseDTO rejectRequest(UUID requestId, UUID riderId) {
        RideRequest request = rideRequestRepository.findById(java.util.Objects.requireNonNull(requestId))
                .orElseThrow(() -> new IllegalArgumentException("Request not found"));

        if (!request.getRide().getRider().getId().equals(riderId)) {
            throw new IllegalArgumentException("Only the ride owner can reject requests");
        }

        request.setStatus(RequestStatus.REJECTED);
        RideRequest saved = rideRequestRepository.save(request);
        return convertToDTO(saved);
    }

    @Transactional
    public RideRequestResponseDTO expireRequest(UUID requestId) {
        RideRequest request = rideRequestRepository.findById(requestId)
                .orElseThrow(() -> new IllegalArgumentException("Request not found"));

        if (request.getStatus() == RequestStatus.PENDING) {
            request.setStatus(RequestStatus.EXPIRED);
            rideRequestRepository.save(request);

            // Send automated chat message to passenger
            String systemMessage = "The rider has not responded to your request within the 2-minute window. The request has expired.";
            chatService.saveMessage(request.getRide().getId(), 
                    java.util.Objects.requireNonNull(request.getRide().getRider().getId()), systemMessage);
            
            RideRequestResponseDTO dto = convertToDTO(request);
            if (dto != null) {
                // Notify via WebSocket status update
                messagingTemplate.convertAndSend("/topic/ride/" + request.getRide().getId() + "/status", dto);
            }
        }

        return convertToDTO(request);
    }

    @Transactional
    public void completePassengerSession(UUID rideId, UUID passengerId) {
        TripSession session = tripSessionRepository.findByRideIdAndPassengerId(rideId, passengerId)
                .orElseThrow(() -> new IllegalArgumentException("Active session not found for this ride"));
        
        if (session.getStatus() == TripStatus.ACTIVE) {
            session.setStatus(TripStatus.COMPLETED);
            session.setEndedAt(LocalDateTime.now());
            tripSessionRepository.save(session);
        }
    }

    /**
     * When both riderAccepted and passengerAccepted are true,
     * create a TripSession and decrement seats.
     */
    private void tryCreateTripSession(RideRequest request) {
        if (request.isRiderAccepted() && request.isPassengerAccepted()) {
            Ride ride = request.getRide();

            if (ride.getSeatsAvailable() <= 0) {
                throw new IllegalStateException("No seats available anymore");
            }

            ride.setSeatsAvailable(ride.getSeatsAvailable() - 1);
            // DO NOT automatically set to IN_PROGRESS when full. 
            // The ride should remain OPEN (but full) until the rider explicitly starts it.
            rideRepository.save(ride);

            TripSession session = TripSession.builder()
                    .ride(ride)
                    .rider(ride.getRider())
                    .passenger(request.getPassenger())
                    .pickupLocation(request.getPickupLocation())
                    .startedAt(LocalDateTime.now())
                    .build();

            tripSessionRepository.save(session);
        }
    }

    @Transactional(readOnly = true)
    public List<RideRequestResponseDTO> getRequestsForRide(UUID rideId) {
        List<RideRequest> list = rideRequestRepository.findByRideId(rideId);
        return list.stream().map(this::convertToDTO).toList();
    }

    @Transactional(readOnly = true)
    public List<RideRequestResponseDTO> getMyRequests(UUID passengerId) {
        List<RideRequest> list = rideRequestRepository.findByPassengerId(passengerId);
        return list.stream().map(this::convertToDTO).toList();
    }

    public RideRequestResponseDTO convertToDTO(RideRequest request) {
        if (request == null)
            return null;

        User p = request.getPassenger();
        RideRequestResponseDTO.PassengerDTO pDTO = RideRequestResponseDTO.PassengerDTO.builder()
                .id(p.getId())
                .name(p.getName())
                .email(p.getEmail())
                .phone(p.getPhone())
                .department(p.getDepartment())
                .course(p.getCourse())
                .year(p.getYear())
                .trustScore(p.getTrustScore())
                .build();

        Ride ride = request.getRide();
        Double contribution = null;
        if (request.getPickupLocation() != null && request.getDropoffLocation() != null) {
            Double distMeters = rideRepository.calculateSegmentDistance(
                    ride.getId(),
                    request.getPickupLocation().getY(), request.getPickupLocation().getX(),
                    request.getDropoffLocation().getY(), request.getDropoffLocation().getX());
            if (distMeters != null) {
                double distKm = distMeters / 1000.0;
                contribution = Math.round((distKm + Math.floor(distKm / 10.0) * 5.0) * 100.0) / 100.0;
            }
        }

        RideRequestResponseDTO.RideInfoDTO rideDTO = RideRequestResponseDTO.RideInfoDTO.builder()
                .id(ride.getId())
                .status(ride.getStatus().name())
                .rider(RideRequestResponseDTO.RiderDTO.builder()
                        .name(ride.getRider().getName())
                        .department(ride.getRider().getDepartment())
                        .course(ride.getRider().getCourse())
                        .year(ride.getRider().getYear())
                        .trustScore(ride.getRider().getTrustScore())
                        .build())
                .build();

        return RideRequestResponseDTO.builder()
                .id(request.getId())
                .ride(rideDTO)
                .passenger(pDTO)
                .pickupLat(request.getPickupLocation().getY())
                .pickupLng(request.getPickupLocation().getX())
                .dropoffLat(request.getDropoffLocation() != null ? request.getDropoffLocation().getY() : null)
                .dropoffLng(request.getDropoffLocation() != null ? request.getDropoffLocation().getX() : null)
                .status(request.getStatus().name())
                .riderAccepted(request.isRiderAccepted())
                .passengerAccepted(request.isPassengerAccepted())
                .estimatedContribution(contribution)
                .createdAt(request.getCreatedAt())
                .build();
    }
}
