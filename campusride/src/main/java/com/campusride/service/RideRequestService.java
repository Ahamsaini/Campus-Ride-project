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

    private static final GeometryFactory geometryFactory = new GeometryFactory(new PrecisionModel(), 4326);

    /**
     * Passenger sends a join request with their pickup location.
     */
    @Transactional
    public RideRequestResponseDTO sendRequest(UUID passengerId, UUID rideId, double pickupLat, double pickupLng,
            Double dropoffLat, Double dropoffLng) {
        if (rideRequestRepository.existsByRideIdAndPassengerId(rideId, passengerId)) {
            throw new IllegalStateException("You have already requested this ride");
        }

        Ride ride = rideRepository.findById(rideId)
                .orElseThrow(() -> new IllegalArgumentException("Ride not found"));

        if (ride.getStatus() != RideStatus.OPEN) {
            throw new IllegalStateException("This ride is no longer open");
        }
        if (ride.getSeatsAvailable() <= 0) {
            throw new IllegalStateException("No seats available");
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

        RideRequest saved = rideRequestRepository.save(builder.build());
        return convertToDTO(saved);
    }

    /**
     * Rider accepts a passenger's request.
     */
    @Transactional
    public RideRequestResponseDTO riderAccept(UUID requestId, UUID riderId) {
        RideRequest request = rideRequestRepository.findById(requestId)
                .orElseThrow(() -> new IllegalArgumentException("Request not found"));

        if (!request.getRide().getRider().getId().equals(riderId)) {
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
        RideRequest request = rideRequestRepository.findById(requestId)
                .orElseThrow(() -> new IllegalArgumentException("Request not found"));

        if (!request.getPassenger().getId().equals(passengerId)) {
            throw new IllegalArgumentException("Only the passenger can confirm");
        }

        request.setPassengerAccepted(true);
        rideRequestRepository.save(request);

        // Check if both sides have accepted
        tryCreateTripSession(request);

        return convertToDTO(request);
    }

    /**
     * Rider rejects a request.
     */
    @Transactional
    public RideRequestResponseDTO rejectRequest(UUID requestId, UUID riderId) {
        RideRequest request = rideRequestRepository.findById(requestId)
                .orElseThrow(() -> new IllegalArgumentException("Request not found"));

        if (!request.getRide().getRider().getId().equals(riderId)) {
            throw new IllegalArgumentException("Only the ride owner can reject requests");
        }

        request.setStatus(RequestStatus.REJECTED);
        RideRequest saved = rideRequestRepository.save(request);
        return convertToDTO(saved);
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
        RideRequestResponseDTO.RideInfoDTO rideDTO = RideRequestResponseDTO.RideInfoDTO.builder()
                .id(ride.getId())
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
                .createdAt(request.getCreatedAt())
                .build();
    }
}
