package com.campusride.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.locationtech.jts.geom.LineString;
import org.locationtech.jts.geom.Point;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "saved_routes")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SavedRoute {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @com.fasterxml.jackson.annotation.JsonIgnore
    private User creator;

    @Column(nullable = false)
    private String name;

    @Column(columnDefinition = "geometry(Point, 4326)", nullable = false)
    private Point startPoint;

    @Column(columnDefinition = "geometry(Point, 4326)", nullable = false)
    private Point endPoint;

    @Column(name = "route_path", columnDefinition = "geometry(LineString, 4326)", nullable = false)
    private LineString routePath;

    @Builder.Default
    @Column(columnDefinition = "integer default 0")
    private Integer usageCount = 0;

    @Builder.Default
    @Column(columnDefinition = "boolean default false")
    private Boolean isAIPriority = false;

    @CreationTimestamp
    private LocalDateTime createdAt;
}
