package com.campusride.dto;

import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChatMessageDTO {
    private UUID id;
    private UUID rideId;
    private UUID senderId;
    private String senderName;
    private String content;
    private LocalDateTime timestamp;
    private boolean read;
}
