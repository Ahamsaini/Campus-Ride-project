package com.campusride.service;

import com.campusride.dto.FeedbackRequest;
import com.campusride.entity.Ride;
import com.campusride.entity.User;
import com.campusride.entity.UserFeedback;
import com.campusride.repository.RideRepository;
import com.campusride.repository.UserFeedbackRepository;
import com.campusride.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserFeedbackService {

        private final UserFeedbackRepository feedbackRepository;
        private final UserRepository userRepository;
        private final RideRepository rideRepository;
        private final org.springframework.messaging.simp.SimpMessagingTemplate messagingTemplate;

        @Transactional
        public void submitFeedback(UUID fromUserId, FeedbackRequest request) {
                UUID fId = java.util.Objects.requireNonNull(fromUserId, "fromUserId cannot be null");
                UUID rId = java.util.Objects.requireNonNull(request.getRideId(), "rideId cannot be null");
                UUID tId = java.util.Objects.requireNonNull(request.getToUserId(), "toUserId cannot be null");

                if (feedbackRepository.existsByRideIdAndFromUserIdAndToUserId(rId, fId, tId)) {
                        throw new IllegalStateException("Feedback already submitted for this participant");
                }

                User fromUser = userRepository.findById(fId)
                                .orElseThrow(() -> new IllegalArgumentException("User not found"));
                User toUser = userRepository.findById(tId)
                                .orElseThrow(() -> new IllegalArgumentException("Target user not found"));
                Ride ride = rideRepository.findById(rId)
                                .orElseThrow(() -> new IllegalArgumentException("Ride not found"));

                UserFeedback feedback = UserFeedback.builder()
                                .fromUser(fromUser)
                                .toUser(toUser)
                                .ride(ride)
                                .pointImpact(request.getPointImpact())
                                .isReport(request.isReport())
                                .reportText(request.getReportText())
                                .build();

                if (feedback == null)
                        throw new IllegalStateException("Feedback builder returned null");
                feedbackRepository.save(feedback);

                // Update Trust Score
                int currentScore = toUser.getTrustScore() != null ? toUser.getTrustScore() : 120;
                toUser.setTrustScore(currentScore + request.getPointImpact());
                userRepository.save(toUser);

                // Send Real-time report to admin if it's a negative report
                if (request.isReport() || request.getPointImpact() < 0) {
                        java.util.Map<String, Object> payload = new java.util.HashMap<>();
                        payload.put("type", "NEW_REPORT");
                        payload.put("fromUserName", fromUser.getName());
                        payload.put("toUserName", toUser.getName());
                        payload.put("reportText",
                                        request.getReportText() != null ? request.getReportText() : "Score Decreased");
                        payload.put("pointImpact", request.getPointImpact());
                        payload.put("rideId", rId.toString());
                        payload.put("createdAt", new java.util.Date().toString());

                        messagingTemplate.convertAndSend("/topic/admin/reports", (Object) payload);
                }
        }
}
