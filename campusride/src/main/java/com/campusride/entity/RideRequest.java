package com.campusride.entity;

import com.campusride.enums.RequestStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.locationtech.jts.geom.Point;

import java.time.LocalDateTime;
import java.util.UUID;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@Entity
@Table(name = "ride_requests", indexes = {
        @Index(name = "idx_request_ride", columnList = "ride_id"),
        @Index(name = "idx_request_passenger", columnList = "passenger_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties({ "hibernateLazyInitializer", "handler" })
public class RideRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ride_id", nullable = false)
    private Ride ride;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "passenger_id", nullable = false)
    private User passenger;

    @Column(name = "pickup_location", columnDefinition = "geometry(Point, 4326)")
    private Point pickupLocation;

    @Column(name = "dropoff_location", columnDefinition = "geometry(Point, 4326)")
    private Point dropoffLocation;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private RequestStatus status = RequestStatus.PENDING;

    @Builder.Default
    private boolean riderAccepted = false;

    @Builder.Default
    private boolean passengerAccepted = false;

    @CreationTimestamp
    private LocalDateTime createdAt;
}
