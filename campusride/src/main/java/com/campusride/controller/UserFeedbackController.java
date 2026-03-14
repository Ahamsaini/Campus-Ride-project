package com.campusride.controller;

import com.campusride.dto.FeedbackRequest;
import com.campusride.service.UserFeedbackService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/feedback")
@RequiredArgsConstructor
public class UserFeedbackController {

    private final UserFeedbackService feedbackService;

    @PostMapping
    public ResponseEntity<?> submitFeedback(
            @AuthenticationPrincipal UUID userId,
            @Valid @RequestBody FeedbackRequest request) {
        feedbackService.submitFeedback(userId, request);
        return ResponseEntity.ok(Map.of("message", "Feedback submitted successfully"));
    }
}
