package com.campusride.controller;

import com.campusride.dto.CreateRouteRequest;
import com.campusride.dto.SavedRouteResponseDTO;
import com.campusride.service.SavedRouteService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/routes")
@RequiredArgsConstructor
public class SavedRouteController {

    private final SavedRouteService savedRouteService;

    @PostMapping
    public ResponseEntity<SavedRouteResponseDTO> saveRoute(
            @AuthenticationPrincipal UUID userId,
            @RequestBody CreateRouteRequest request) {
        return ResponseEntity.ok(savedRouteService.saveRoute(userId, request));
    }

    @GetMapping("/my")
    public ResponseEntity<List<SavedRouteResponseDTO>> getMyRoutes(@AuthenticationPrincipal UUID userId) {
        return ResponseEntity.ok(savedRouteService.getMySavedRoutes(userId));
    }

    @GetMapping("/all")
    public ResponseEntity<List<SavedRouteResponseDTO>> getAllRoutes() {
        return ResponseEntity.ok(savedRouteService.getAllPublicRoutes());
    }

    @GetMapping("/ai-suggest")
    public ResponseEntity<SavedRouteResponseDTO> getAISuggestion(
            @RequestParam double sLat, @RequestParam double sLng,
            @RequestParam double eLat, @RequestParam double eLng) {
        return savedRouteService.getSmartSuggestion(sLat, sLng, eLat, eLng)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.noContent().build());
    }

    @GetMapping("/ai-suggest-all")
    public ResponseEntity<List<SavedRouteResponseDTO>> getAllAISuggestions(
            @RequestParam double sLat, @RequestParam double sLng,
            @RequestParam double eLat, @RequestParam double eLng) {
        List<SavedRouteResponseDTO> suggestions = savedRouteService.getSmartSuggestions(sLat, sLng, eLat, eLng);
        return ResponseEntity.ok(suggestions);
    }
}
