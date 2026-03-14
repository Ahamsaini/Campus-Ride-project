package com.campusride.controller;

import com.campusride.dto.ChatMessageDTO;
import com.campusride.service.ChatService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@Controller
@RequiredArgsConstructor
public class ChatController {

    private final ChatService chatService;
    private final SimpMessagingTemplate messagingTemplate;

    /**
     * STOMP endpoint: /app/chat/send
     * Payload: { "rideId": "...", "senderId": "...", "content": "Hello" }
     */
    @MessageMapping("/chat/send")
    public void sendMessage(Map<String, Object> payload) {
        String rideIdStr = (String) payload.get("rideId");
        String senderIdStr = (String) payload.get("senderId");
        String content = (String) payload.get("content");

        if (rideIdStr == null || senderIdStr == null || content == null) {
            System.err.println("Chat payload missing fields: " + payload);
            return;
        }

        UUID rideId = UUID.fromString(rideIdStr);
        UUID senderId = UUID.fromString(senderIdStr);
        String decodedContent = content; // If we want to decode on server side later

        ChatMessageDTO saved = chatService.saveMessage(rideId, senderId, decodedContent);

        // Broadcast to /topic/chat/{rideId}
        messagingTemplate.convertAndSend("/topic/chat/" + rideId, saved);
    }

    /**
     * REST endpoint for chat history.
     */
    @GetMapping("/api/chat/{rideId}/history")
    @ResponseBody
    public ResponseEntity<Page<ChatMessageDTO>> getHistory(
            @PathVariable UUID rideId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(chatService.getHistory(rideId, page, size));
    }

    /**
     * Mark a single message as read.
     */
    @PutMapping("/api/chat/read/{messageId}")
    @ResponseBody
    public ResponseEntity<Void> markAsRead(@PathVariable UUID messageId) {
        chatService.markAsRead(messageId);
        return ResponseEntity.ok().build();
    }

    /**
     * Mark all unread messages in a ride as read for the current user.
     */
    @PutMapping("/api/chat/{rideId}/read-all")
    @ResponseBody
    public ResponseEntity<Void> markAllAsRead(
            @PathVariable UUID rideId,
            @AuthenticationPrincipal UUID userId) {
        chatService.markAllAsRead(rideId, userId);
        return ResponseEntity.ok().build();
    }
}
