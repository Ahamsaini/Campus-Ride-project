package com.campusride.entity;

import com.campusride.enums.Role;
import com.campusride.enums.Gender;
import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties({ "hibernateLazyInitializer", "handler" })
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @NotBlank
    private String name;

    @NotBlank
    @Email
    @Pattern(regexp = ".*@shobhituniversity\\.ac\\.in$", message = "Only @shobhituniversity.ac.in emails are allowed")
    @Column(unique = true, nullable = false)
    private String email;

    @NotBlank
    private String password;

    @NotBlank(message = "Phone number is required")
    @Pattern(regexp = "^[0-9+\\- ]{10,15}$", message = "Phone must be between 10 to 15 digits (may include +, -, spaces)")
    private String phone;

    @NotBlank
    private String department;

    @NotBlank
    private String course;

    @Min(1)
    @Max(5)
    private Integer year;

    @Column(unique = true, nullable = true)
    private String rollNumber;

    @Column(nullable = true)
    @Enumerated(EnumType.STRING)
    private Gender gender; // MALE, FEMALE, OTHER

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private Role role = Role.STUDENT;

    @Builder.Default
    private Boolean verified = false;

    @Builder.Default
    private Boolean blocked = false;

    @Builder.Default
    private Integer trustScore = 120;

    @Builder.Default
    private Double totalDistance = 0.0;

    @Builder.Default
    private Integer totalRides = 0;

    @CreationTimestamp
    private LocalDateTime createdAt;
}
