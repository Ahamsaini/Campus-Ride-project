package com.campusride.controller;

import com.campusride.entity.RideTemplate;
import com.campusride.repository.RideTemplateRepository;
import com.campusride.repository.SavedRouteRepository;
import com.campusride.entity.User;
import com.campusride.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalTime;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@RestController
@RequestMapping("/api/ride-templates")
@RequiredArgsConstructor
public class RideTemplateController {

    private final RideTemplateRepository templateRepository;
    private final SavedRouteRepository routeRepository;
    private final UserRepository userRepository;

    @PostMapping
    public ResponseEntity<RideTemplate> createTemplate(@RequestBody TemplateRequest request) {
        User creator = userRepository.findById(java.util.Objects.requireNonNull(request.userId()))
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        var route = routeRepository.findById(java.util.Objects.requireNonNull(request.routeId()))
                .orElseThrow(() -> new IllegalArgumentException("Route not found"));

        RideTemplate template = RideTemplate.builder()
                .creator(creator)
                .route(route)
                .departureTime(java.util.Objects.requireNonNull(request.departureTime(), "Departure time is required"))
                .daysOfWeek(request.daysOfWeek())
                .seatsAvailable(request.seatsAvailable())

                .active(true)
                .build();

        return ResponseEntity.ok(templateRepository.save(java.util.Objects.requireNonNull(template)));
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<RideTemplate>> getUserTemplates(@PathVariable UUID userId) {
        return ResponseEntity.ok(templateRepository.findByCreatorId(java.util.Objects.requireNonNull(userId)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTemplate(@PathVariable UUID id) {
        templateRepository.deleteById(java.util.Objects.requireNonNull(id));
        return ResponseEntity.ok().build();
    }

    public record TemplateRequest(
            UUID userId,
            UUID routeId,
            LocalTime departureTime,
            Set<Integer> daysOfWeek,
            int seatsAvailable) {
    }
}
