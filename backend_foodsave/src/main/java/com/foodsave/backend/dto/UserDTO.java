package com.foodsave.backend.dto;

import com.foodsave.backend.domain.enums.UserRole;
import com.foodsave.backend.entity.User;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserDTO {
    private Long id;

    @NotBlank
    @Size(max = 50)
    private String firstName;

    @NotBlank
    @Size(max = 50)
    private String lastName;

    @NotBlank
    @Email
    @Size(max = 100)
    private String email;

    @Size(max = 20)
    private String phone;

    private String profilePicture;

    private String address;

    // Пароль не возвращаем в fromEntity!
    private String password;

    private UserRole role;

    private Boolean active;

    private String registrationSource;

    private Boolean telegramUser;

    private Long telegramUserId;

    private String telegramUsername;

    private String telegramPhotoUrl;

    private String telegramLanguageCode;

    private LocalDateTime telegramRegisteredAt;

    public static UserDTO fromEntity(User user) {
        if (user == null) {
            return null;
        }
        return UserDTO.builder()
                .id(user.getId())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .email(user.getEmail())
                .phone(user.getPhone())
                .profilePicture(user.getProfilePicture())
                .address(user.getAddress())
                .role(user.getRole())
                .active(user.isActive())
                .registrationSource(user.getRegistrationSource() != null
                        ? user.getRegistrationSource()
                        : (user.isTelegramUser() ? "TELEGRAM" : "WEB"))
                .telegramUser(user.isTelegramUser())
                .telegramUserId(user.getTelegramUserId())
                .telegramUsername(user.getTelegramUsername())
                .telegramPhotoUrl(user.getTelegramPhotoUrl())
                .telegramLanguageCode(user.getTelegramLanguageCode())
                .telegramRegisteredAt(user.getTelegramRegisteredAt())
                .password(null) // Никогда не возвращаем пароль!
                .build();
    }
}
