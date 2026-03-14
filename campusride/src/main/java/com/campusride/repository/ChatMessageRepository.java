package com.campusride.repository;

import com.campusride.entity.ChatMessage;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, UUID> {

    Page<ChatMessage> findByRideIdOrderByTimestampDesc(UUID rideId, Pageable pageable);

    List<ChatMessage> findByRideIdAndReadFalseAndSenderIdNot(UUID rideId, UUID currentUserId);
}
