package com.campusride.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalTime;
import java.util.Set;
import java.util.UUID;

@Entity
@Table(name = "ride_templates")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RideTemplate {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @com.fasterxml.jackson.annotation.JsonIgnore
    private User creator;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "route_id", nullable = false)
    @com.fasterxml.jackson.annotation.JsonIgnore
    private SavedRoute route;

    @Column(nullable = false)
    private LocalTime departureTime;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "ride_template_days", joinColumns = @JoinColumn(name = "template_id"))
    @Column(name = "day_of_week")
    private Set<Integer> daysOfWeek; // 1=Mon, 2=Tue... 7=Sun

    private int seatsAvailable;



    @Builder.Default
    private boolean active = true;
}
