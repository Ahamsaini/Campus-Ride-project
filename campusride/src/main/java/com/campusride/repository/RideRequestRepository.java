package com.campusride.repository;

import com.campusride.entity.RideRequest;
import com.campusride.enums.RequestStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface RideRequestRepository extends JpaRepository<RideRequest, UUID> {

    List<RideRequest> findByRideId(UUID rideId);

    List<RideRequest> findByPassengerId(UUID passengerId);

    List<RideRequest> findByRideIdAndStatus(UUID rideId, RequestStatus status);

    boolean existsByRideIdAndPassengerId(UUID rideId, UUID passengerId);

    boolean existsByRideIdAndPassengerIdAndStatusIn(UUID rideId, UUID passengerId, List<RequestStatus> statuses);
}
