package com.campusride.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuthResponse {
    private String token;
    private java.util.UUID id;
    private String name;
    private String email;
    private String role;
    private String department;
    private boolean verified;
    private String gender;
    private String rollNumber;
}
