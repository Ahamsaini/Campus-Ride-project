package com.campusride.service;

import com.campusride.entity.Ride;
import com.campusride.entity.RideTemplate;
import com.campusride.enums.RideStatus;
import com.campusride.repository.RideRepository;
import com.campusride.repository.RideTemplateRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class RideTemplateService {

    private final RideTemplateRepository templateRepository;
    private final RideRepository rideRepository;

    /**
     * Runs every day at 1:00 AM to generate rides for the current day based on
     * templates.
     */
    @Scheduled(cron = "0 0 1 * * *")
    @Transactional
    public void generateDailyRides() {
        LocalDate today = LocalDate.now();
        int dayOfWeek = today.getDayOfWeek().getValue(); // 1-7

        List<RideTemplate> templates = templateRepository.findByActiveTrue();

        for (RideTemplate template : templates) {
            if (template.getDaysOfWeek() != null && template.getDaysOfWeek().contains(dayOfWeek)) {
                createRideFromTemplate(template, today);
            }
        }
    }

    private void createRideFromTemplate(RideTemplate template, LocalDate date) {
        if (template.getDepartureTime() == null) {
            log.warn("RideTemplate {} has no departure time, skipping auto-generation.", template.getId());
            return;
        }
        LocalDateTime departure = LocalDateTime.of(date, template.getDepartureTime());

        // Simple check to prevent double creation if the job re-runs
        boolean exists = rideRepository.existsByRiderIdAndDepartureTime(
                template.getCreator().getId(), departure);

        if (exists) {
            log.info("Ride already exists for {} at {}, skipping.", template.getCreator().getName(), departure);
            return;
        }

        Ride ride = Ride.builder()
                .rider(template.getCreator())
                .startPoint(template.getRoute().getStartPoint())
                .endPoint(template.getRoute().getEndPoint())
                .routePath(template.getRoute().getRoutePath())
                .departureTime(departure)
                .seatsAvailable(template.getSeatsAvailable())

                .status(RideStatus.OPEN)
                .build();

        rideRepository.save(java.util.Objects.requireNonNull(ride));
        log.info("Auto-generated ride for {} at {}", template.getCreator().getName(), departure);
    }
}
