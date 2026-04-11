package com.campusride.repository;

import com.campusride.entity.SavedRoute;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.Optional;

public interface SavedRouteRepository extends JpaRepository<SavedRoute, UUID> {
        List<SavedRoute> findByCreatorId(UUID creatorId);

        @Query(value = """
                        SELECT * FROM saved_routes
                        WHERE ST_DWithin(start_point::geography, ST_SetSRID(ST_MakePoint(:sLng, :sLat), 4326)::geography, 2000)
                          AND ST_DWithin(end_point::geography, ST_SetSRID(ST_MakePoint(:eLng, :eLat), 4326)::geography, 2000)
                        /* Ensure general direction matches to avoid suggesting reverse routes */
                        AND (
                            (ST_X(end_point) - ST_X(start_point)) * (:eLng - :sLng) +
                            (ST_Y(end_point) - ST_Y(start_point)) * (:eLat - :sLat)
                        ) > 0
                        ORDER BY isaipriority DESC, usage_count DESC
                        LIMIT 1
                        """, nativeQuery = true)
        Optional<SavedRoute> findSmartRoute(
                        @Param("sLat") double sLat, @Param("sLng") double sLng,
                        @Param("eLat") double eLat, @Param("eLng") double eLng);

        @Query(value = """
                        SELECT * FROM saved_routes
                        WHERE ST_DWithin(start_point::geography, ST_SetSRID(ST_MakePoint(:sLng, :sLat), 4326)::geography, 2000)
                          AND ST_DWithin(end_point::geography, ST_SetSRID(ST_MakePoint(:eLng, :eLat), 4326)::geography, 2000)
                        /* Ensure general direction matches to avoid suggesting reverse routes */
                        AND (
                            (ST_X(end_point) - ST_X(start_point)) * (:eLng - :sLng) +
                            (ST_Y(end_point) - ST_Y(start_point)) * (:eLat - :sLat)
                        ) > 0
                        ORDER BY isaipriority DESC, usage_count DESC
                        LIMIT 5
                        """, nativeQuery = true)
        List<SavedRoute> findSmartRoutes(
                        @Param("sLat") double sLat, @Param("sLng") double sLng,
                        @Param("eLat") double eLat, @Param("eLng") double eLng);

        List<SavedRoute> findAll();
}
