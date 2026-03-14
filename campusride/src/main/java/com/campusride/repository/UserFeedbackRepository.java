package com.campusride.repository;

import com.campusride.entity.UserFeedback;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface UserFeedbackRepository extends JpaRepository<UserFeedback, UUID> {
    List<UserFeedback> findByToUserId(UUID toUserId);

    List<UserFeedback> findByRideId(UUID rideId);

    boolean existsByRideIdAndFromUserId(UUID rideId, UUID fromUserId);

    boolean existsByRideIdAndFromUserIdAndToUserId(UUID rideId, UUID fromUserId, UUID toUserId);

    @org.springframework.data.jpa.repository.Query("SELECT f FROM UserFeedback f JOIN FETCH f.fromUser JOIN FETCH f.toUser JOIN FETCH f.ride ORDER BY f.createdAt DESC")
    List<UserFeedback> findAllWithDetails();
}
