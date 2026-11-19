package com.foodsave.backend.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

/** One opt-in per user. Coordinates from Telegram are used only in memory. */
@Entity
@Table(name = "nearby_walks")
@Getter
@Setter
public class NearbyWalk {
    @Id private Long userId;
    private long commandId;
    private long startedAt;
    private Long locationMessageId;
    private long lastUpdateId;
    private boolean finished;
    private String language;
}
