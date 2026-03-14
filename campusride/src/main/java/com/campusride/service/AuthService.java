package com.campusride.service;

import com.campusride.config.JwtUtil;
import com.campusride.dto.*;
import com.campusride.entity.User;
import com.campusride.enums.Gender;
import com.campusride.enums.Role;
import com.campusride.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("Email already registered");
        }

        Role userRole = "ADMIN".equalsIgnoreCase(request.getRole()) ? Role.ADMIN : Role.STUDENT;
        boolean isVerified = Role.ADMIN.equals(userRole); // Auto-verify admins for now

        User user = User.builder()
                .name(request.getName().trim())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .phone(request.getPhone())
                .department(request.getDepartment())
                .course(request.getCourse())
                .year(request.getYear())
                .rollNumber(request.getRollNumber())
                .gender(Gender.valueOf(request.getGender().toUpperCase()))
                .role(userRole)
                .verified(isVerified)
                .build();

        user = userRepository.save(user);

        String token = jwtUtil.generateToken(user.getId(), user.getRole().name(), user.getDepartment());

        return AuthResponse.builder()
                .token(token)
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .role(user.getRole().name())
                .department(user.getDepartment())
                .verified(Boolean.TRUE.equals(user.getVerified()))
                .gender(user.getGender().name())
                .rollNumber(user.getRollNumber())
                .build();
    }

    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new IllegalArgumentException("Invalid email or password"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new IllegalArgumentException("Invalid email or password");
        }

        if (Boolean.TRUE.equals(user.getBlocked())) {
            throw new IllegalStateException("Your account has been blocked. Contact admin.");
        }

        String token = jwtUtil.generateToken(user.getId(), user.getRole().name(), user.getDepartment());

        return AuthResponse.builder()
                .token(token)
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .role(user.getRole().name())
                .department(user.getDepartment())
                .verified(Boolean.TRUE.equals(user.getVerified()))
                .gender(user.getGender().name())
                .rollNumber(user.getRollNumber())
                .build();
    }
}
