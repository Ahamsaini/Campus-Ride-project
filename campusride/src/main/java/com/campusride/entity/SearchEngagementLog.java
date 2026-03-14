package com.campusride.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.locationtech.jts.geom.Point;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "search_engagement_logs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SearchEngagementLog {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    private UUID passengerId;

    @Column(columnDefinition = "geometry(Point, 4326)")
    private Point pickupLocation;

    @Column(columnDefinition = "geometry(Point, 4326)")
    private Point dropoffLocation;

    private boolean resultsFound;

    private int resultCount;

    @CreationTimestamp
    private LocalDateTime timestamp;
}
