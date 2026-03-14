package com.campusride.repository;

import com.campusride.entity.TripSession;
import com.campusride.enums.TripStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TripSessionRepository extends JpaRepository<TripSession, UUID> {

    List<TripSession> findByRideId(UUID rideId);

    Optional<TripSession> findByRideIdAndPassengerId(UUID rideId, UUID passengerId);

    List<TripSession> findByStatus(TripStatus status);

    List<TripSession> findByRiderIdOrPassengerId(UUID riderId, UUID passengerId);

    List<TripSession> findByStartedAtBetween(java.time.LocalDateTime start, java.time.LocalDateTime end);
}
