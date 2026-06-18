package com.foodsave.backend.dto.telegram;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record TelegramUser(
        Long id,
        String firstName,
        String lastName,
        String username
) {
    public String displayName() {
        if (firstName != null && !firstName.isBlank()) {
            if (lastName != null && !lastName.isBlank()) {
                return firstName + " " + lastName;
            }
            return firstName;
        }
        if (username != null && !username.isBlank()) {
            return "@" + username;
        }
        return "клиента";
    }
}
