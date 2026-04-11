package com.campusride.repository;

import com.campusride.entity.Ride;
import com.campusride.enums.RideStatus;
import com.campusride.enums.TripStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface RideRepository extends JpaRepository<Ride, UUID> {

  List<Ride> findByRiderId(UUID riderId);

  boolean existsByRiderIdAndDepartureTime(UUID riderId, java.time.LocalDateTime departureTime);

  java.util.Optional<Ride> findByTrackingToken(String token);

  List<Ride> findByStatusIn(List<RideStatus> statuses);

  @Query("SELECT r FROM Ride r WHERE r.status IN :rideStatuses " +
         "AND (r.rider.id = :userId OR EXISTS (SELECT s FROM TripSession s WHERE s.ride = r AND s.passenger.id = :userId AND s.status = :tripStatus)) " +
         "ORDER BY r.createdAt DESC")
  List<Ride> findActiveRidesForUser(
      @Param("userId") UUID userId, 
      @Param("rideStatuses") List<RideStatus> rideStatuses,
      @Param("tripStatus") TripStatus tripStatus);

  /**
   * Advanced Double-Point Matching (BlaBlaCar Style).
   * 1. Checks if Pickup is within radius.
   * 2. Checks if Dropoff is within radius.
   * 3. Ensures Pickup position on LineString < Dropoff position.
   */
  @Query(value = """
      SELECT r.*,
             ST_Distance(r.route_path::geography, ST_SetSRID(ST_MakePoint(:pLng, :pLat), 4326)::geography) AS pickup_dist,
             ST_LineLocatePoint(r.route_path, ST_SetSRID(ST_MakePoint(:pLng, :pLat), 4326)) AS p_pos,
             ST_LineLocatePoint(r.route_path, ST_SetSRID(ST_MakePoint(:dLng, :dLat), 4326)) AS d_pos,
             ST_Length(ST_LineSubstring(r.route_path, 
                 ST_LineLocatePoint(r.route_path, ST_SetSRID(ST_MakePoint(:pLng, :pLat), 4326)),
                 ST_LineLocatePoint(r.route_path, ST_SetSRID(ST_MakePoint(:dLng, :dLat), 4326))
             )::geography) AS segment_dist
      FROM rides r
      JOIN users u ON r.rider_id = u.id
      WHERE ST_DWithin(r.route_path::geography, ST_SetSRID(ST_MakePoint(:pLng, :pLat), 4326)::geography, :radius)
        AND ST_DWithin(r.route_path::geography, ST_SetSRID(ST_MakePoint(:dLng, :dLat), 4326)::geography, :radius)
        AND ST_LineLocatePoint(r.route_path, ST_SetSRID(ST_MakePoint(:pLng, :pLat), 4326)) <
            ST_LineLocatePoint(r.route_path, ST_SetSRID(ST_MakePoint(:dLng, :dLat), 4326))
        /* Directional Vector check (Dot Product): Ensures general trip vectors align */
        AND (
            (ST_X(r.end_point) - ST_X(r.start_point)) * (:dLng - :pLng) +
            (ST_Y(r.end_point) - ST_Y(r.start_point)) * (:dLat - :pLat)
        ) > 0
        AND r.status IN ('OPEN', 'IN_PROGRESS')
        AND r.seats_available > 0
      ORDER BY p_pos ASC
      """, nativeQuery = true)
  List<Object[]> findRidesByRouteOverlap(
      @Param("pLng") double pLng, @Param("pLat") double pLat,
      @Param("dLng") double dLng, @Param("dLat") double dLat,
      @Param("radius") double radius,
      @Param("userGender") String userGender);
  @Query(value = "SELECT ST_Length(ST_LineSubstring(r.route_path, " +
                 "ST_LineLocatePoint(r.route_path, ST_SetSRID(ST_MakePoint(:pLng, :pLat), 4326)), " +
                 "ST_LineLocatePoint(r.route_path, ST_SetSRID(ST_MakePoint(:dLng, :dLat), 4326)) " +
                 ")::geography) FROM rides r WHERE r.id = :rideId", nativeQuery = true)
  Double calculateSegmentDistance(@Param("rideId") UUID rideId, 
                                 @Param("pLat") double pLat, @Param("pLng") double pLng,
                                 @Param("dLat") double dLat, @Param("dLng") double dLng);
  @Query(value = "SELECT ST_LineLocatePoint(r.route_path, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)) FROM rides r WHERE r.id = :rideId", nativeQuery = true)
  Double calculatePointProgress(@Param("rideId") UUID rideId, @Param("lat") double lat, @Param("lng") double lng);
}
