package com.campusride.entity;

import com.campusride.enums.RideStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.locationtech.jts.geom.LineString;
import org.locationtech.jts.geom.Point;

import java.time.LocalDateTime;
import java.util.UUID;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@Entity
@Table(name = "rides", indexes = {
        @Index(name = "idx_ride_status", columnList = "status"),
        @Index(name = "idx_ride_rider", columnList = "rider_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties({ "hibernateLazyInitializer", "handler" })
public class Ride {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "rider_id", nullable = false)
    private User rider;

    @Column(columnDefinition = "geometry(Point, 4326)", nullable = false)
    private Point startPoint;

    @Column(columnDefinition = "geometry(Point, 4326)", nullable = false)
    private Point endPoint;

    private String pickupLocationName;
    private String dropoffLocationName;

    @Column(name = "route_path", columnDefinition = "geometry(LineString, 4326)", nullable = false)
    private LineString routePath;

    @Column(name = "seats_available")
    @Builder.Default
    private Integer seatsAvailable = 0;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "vehicle_id")
    private Vehicle vehicle;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "route_id")
    private SavedRoute route;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private RideStatus status = RideStatus.OPEN;

    @Column(name = "departure_time", nullable = false)
    private LocalDateTime departureTime;



    @CreationTimestamp
    private LocalDateTime createdAt;

    @Builder.Default
    private Boolean emergencyActive = false;

    @Column(name = "tracking_token", unique = true)
    private String trackingToken;

    @Column(name = "is_sharing_active")
    @Builder.Default
    private Boolean sharingActive = false;
}
