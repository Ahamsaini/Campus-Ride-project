package com.campusride.service;

import com.campusride.dto.CreateRouteRequest;
import com.campusride.dto.SavedRouteResponseDTO;
import com.campusride.entity.SavedRoute;
import com.campusride.entity.User;
import com.campusride.repository.SavedRouteRepository;
import com.campusride.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.locationtech.jts.geom.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SavedRouteService {

        private final SavedRouteRepository savedRouteRepository;
        private final UserRepository userRepository;
        private static final GeometryFactory geometryFactory = new GeometryFactory(new PrecisionModel(), 4326);

        @Transactional
        public SavedRouteResponseDTO saveRoute(UUID creatorId, CreateRouteRequest request) {
                User creator = userRepository.findById(creatorId)
                                .orElseThrow(() -> new IllegalArgumentException("User not found"));

                Point startPoint = geometryFactory.createPoint(
                                new Coordinate(request.getStartLng(), request.getStartLat()));
                Point endPoint = geometryFactory.createPoint(
                                new Coordinate(request.getEndLng(), request.getEndLat()));

                Coordinate[] coords = request.getRouteCoordinates().stream()
                                .map(c -> new Coordinate(c[0], c[1]))
                                .toArray(Coordinate[]::new);
                LineString routePath = geometryFactory.createLineString(coords);

                SavedRoute route = SavedRoute.builder()
                                .creator(creator)
                                .name(request.getName())
                                .startPoint(startPoint)
                                .endPoint(endPoint)
                                .routePath(routePath)
                                .build();

                SavedRoute saved = savedRouteRepository.save(route);
                return convertToDTO(saved);
        }

        public List<SavedRouteResponseDTO> getMySavedRoutes(UUID creatorId) {
                return savedRouteRepository.findByCreatorId(creatorId).stream()
                                .map(this::convertToDTO)
                                .toList();
        }

        public List<SavedRouteResponseDTO> getAllPublicRoutes() {
                return savedRouteRepository.findAll().stream()
                                .map(this::convertToDTO)
                                .toList();
        }

        public java.util.Optional<SavedRouteResponseDTO> getSmartSuggestion(double sLat, double sLng, double eLat,
                        double eLng) {
                return savedRouteRepository.findSmartRoute(sLat, sLng, eLat, eLng)
                                .map(this::convertToDTO);
        }

        public List<SavedRouteResponseDTO> getSmartSuggestions(double sLat, double sLng, double eLat, double eLng) {
                return savedRouteRepository.findSmartRoutes(sLat, sLng, eLat, eLng).stream()
                                .map(this::convertToDTO)
                                .toList();
        }

        private SavedRouteResponseDTO convertToDTO(SavedRoute route) {
                java.util.List<double[]> coords = new java.util.ArrayList<>();
                for (org.locationtech.jts.geom.Coordinate c : route.getRoutePath().getCoordinates()) {
                        coords.add(new double[] { c.getY(), c.getX() }); // [lat, lng]
                }

                return SavedRouteResponseDTO.builder()
                                .id(route.getId())
                                .name(route.getName())
                                .startLat(route.getStartPoint().getY())
                                .startLng(route.getStartPoint().getX())
                                .endLat(route.getEndPoint().getY())
                                .endLng(route.getEndPoint().getX())
                                .routeCoordinates(coords)
                                .usageCount(route.getUsageCount())
                                .isAIPriority(route.getIsAIPriority())
                                .build();
        }
}
