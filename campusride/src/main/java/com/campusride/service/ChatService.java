package com.campusride.service;

import com.campusride.dto.ChatMessageDTO;
import com.campusride.entity.ChatMessage;
import com.campusride.entity.User;
import com.campusride.repository.ChatMessageRepository;
import com.campusride.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ChatService {

    private final ChatMessageRepository chatMessageRepository;
    private final UserRepository userRepository;

    @Transactional
    public ChatMessageDTO saveMessage(UUID rideId, UUID senderId, String content) {
        User sender = userRepository.findById(senderId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        ChatMessage message = ChatMessage.builder()
                .rideId(rideId)
                .senderId(senderId)
                .content(content)
                .build();

        message = chatMessageRepository.save(message);

        return toDTO(message, sender.getName());
    }

    public Page<ChatMessageDTO> getHistory(UUID rideId, int page, int size) {
        Page<ChatMessage> messages = chatMessageRepository
                .findByRideIdOrderByTimestampDesc(rideId, PageRequest.of(page, size));

        return messages.map(msg -> {
            String senderName = userRepository.findById(msg.getSenderId())
                    .map(User::getName).orElse("Unknown");
            return toDTO(msg, senderName);
        });
    }

    @Transactional
    public void markAsRead(UUID messageId) {
        chatMessageRepository.findById(messageId).ifPresent(msg -> {
            msg.setRead(true);
            chatMessageRepository.save(msg);
        });
    }

    @Transactional
    public void markAllAsRead(UUID rideId, UUID currentUserId) {
        List<ChatMessage> unread = chatMessageRepository
                .findByRideIdAndReadFalseAndSenderIdNot(rideId, currentUserId);
        unread.forEach(msg -> msg.setRead(true));
        chatMessageRepository.saveAll(unread);
    }

    private ChatMessageDTO toDTO(ChatMessage msg, String senderName) {
        return ChatMessageDTO.builder()
                .id(msg.getId())
                .rideId(msg.getRideId())
                .senderId(msg.getSenderId())
                .senderName(senderName)
                .content(msg.getContent())
                .timestamp(msg.getTimestamp())
                .read(msg.isRead())
                .build();
    }
}
