package com.campusride.dto;

import jakarta.validation.constraints.*;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RegisterRequest {

    @NotBlank(message = "Name is required")
    @Pattern(regexp = "^[A-Za-z]+(\\s[A-Za-z]+)*$", message = "Name must contain only letters and single spaces between words")
    private String name;

    @NotBlank
    @Email
    @Pattern(regexp = ".*@shobhituniversity\\.ac\\.in$", message = "Only @shobhituniversity.ac.in emails are allowed")
    private String email;

    @NotBlank(message = "Password is required")
    @Size(min = 6, message = "Password must be at least 6 characters")
    @Pattern(
        regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&#^()_+=\\-])[A-Za-z\\d@$!%*?&#^()_+=\\-]{6,}$",
        message = "Password must contain at least one lowercase letter, one uppercase letter, one digit, and one special character"
    )
    private String password;

    @NotBlank(message = "Phone number is required")
    @Pattern(regexp = "^[0-9]{10}$", message = "Phone must be exactly 10 digits with no letters")
    private String phone;

    @NotBlank
    private String department;

    @NotBlank
    private String course;

    @Min(1)
    @Max(5)
    private Integer year;

    @NotBlank
    private String rollNumber;

    @NotBlank
    private String gender;

    private String role; // STUDENT or ADMIN
}
