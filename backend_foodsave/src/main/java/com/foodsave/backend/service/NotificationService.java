package com.foodsave.backend.service;

import com.foodsave.backend.dto.NotificationDTO;
import com.foodsave.backend.dto.NotificationSettingsDTO;
import com.foodsave.backend.dto.TelegramBroadcastRequest;
import com.foodsave.backend.entity.Notification;
import com.foodsave.backend.entity.NotificationSettings;
import com.foodsave.backend.entity.User;
import com.foodsave.backend.exception.ApiException;
import com.foodsave.backend.exception.ResourceNotFoundException;
import com.foodsave.backend.repository.NotificationRepository;
import com.foodsave.backend.repository.NotificationSettingsRepository;
import com.foodsave.backend.repository.UserRepository;
import com.foodsave.backend.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
@Slf4j
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final NotificationSettingsRepository settingsRepository;
    private final SecurityUtils securityUtils;
    private final UserRepository userRepository;
    private final TelegramBotService telegramBotService;

    public List<NotificationDTO> getAllNotifications() {
        User currentUser = securityUtils.getCurrentUser();
        return notificationRepository.findByUserOrderByCreatedAtDesc(currentUser).stream()
                .map(NotificationDTO::fromEntity)
                .collect(Collectors.toList());
    }

    public Long getUnreadCount() {
        User currentUser = securityUtils.getCurrentUser();
        return notificationRepository.countByUserAndReadFalse(currentUser);
    }

    public NotificationDTO markAsRead(Long id) {
        User currentUser = securityUtils.getCurrentUser();
        Notification notification = notificationRepository.findByIdAndUser(id, currentUser)
                .orElseThrow(() -> new ResourceNotFoundException("Notification not found with id: " + id));

        notification.setRead(true);
        return NotificationDTO.fromEntity(notificationRepository.save(notification));
    }

    public void markAllAsRead() {
        User currentUser = securityUtils.getCurrentUser();
        List<Notification> unreadNotifications = notificationRepository.findByUserAndReadFalse(currentUser);
        unreadNotifications.forEach(notification -> notification.setRead(true));
        notificationRepository.saveAll(unreadNotifications);
    }

    public void deleteNotification(Long id) {
        User currentUser = securityUtils.getCurrentUser();
        Notification notification = notificationRepository.findByIdAndUser(id, currentUser)
                .orElseThrow(() -> new ResourceNotFoundException("Notification not found with id: " + id));
        notificationRepository.delete(notification);
    }

    public void deleteNotifications(List<Long> ids) {
        User currentUser = securityUtils.getCurrentUser();
        List<Notification> notifications = notificationRepository.findAllByIdInAndUser(ids, currentUser);
        notificationRepository.deleteAll(notifications);
    }

    public NotificationSettingsDTO getNotificationSettings() {
        User currentUser = securityUtils.getCurrentUser();
        NotificationSettings settings = settingsRepository.findByUser(currentUser)
                .orElseGet(() -> createDefaultSettings(currentUser));
        return NotificationSettingsDTO.fromEntity(settings);
    }

    public NotificationSettingsDTO updateNotificationSettings(NotificationSettingsDTO settingsDTO) {
        User currentUser = securityUtils.getCurrentUser();
        NotificationSettings settings = settingsRepository.findByUser(currentUser)
                .orElseGet(() -> createDefaultSettings(currentUser));

        settings.setEmailEnabled(settingsDTO.isEmailEnabled());
        settings.setPushEnabled(settingsDTO.isPushEnabled());
        settings.setSmsEnabled(settingsDTO.isSmsEnabled());
        settings.setOrderUpdates(settingsDTO.isOrderUpdates());
        settings.setPromotions(settingsDTO.isPromotions());
        settings.setSystemUpdates(settingsDTO.isSystemUpdates());

        return NotificationSettingsDTO.fromEntity(settingsRepository.save(settings));
    }

    public int sendTelegramBroadcast(TelegramBroadcastRequest request) {
        if (request == null) {
            throw new ApiException("Telegram broadcast payload is required", HttpStatus.BAD_REQUEST);
        }

        String message = sanitize(request.getMessage());
        if (message == null) {
            throw new ApiException("Message is required", HttpStatus.BAD_REQUEST);
        }

        String title = sanitize(request.getTitle());
        boolean buttonEnabled = Boolean.TRUE.equals(request.getButtonEnabled());
        String buttonText = null;
        String buttonUrl = null;

        if (buttonEnabled) {
            buttonText = sanitize(request.getButtonText());
            if (buttonText == null) {
                buttonText = "Открыть";
            }
            String rawUrl = sanitize(request.getButtonUrl());
            if (rawUrl == null) {
                throw new ApiException("Button URL is required when button notifications are enabled", HttpStatus.BAD_REQUEST);
            }
            buttonUrl = telegramBotService.resolveButtonUrl(rawUrl);
        }

        String imageUrl = sanitize(request.getImageUrl());

        String payloadText = buildTelegramMessage(title, message);
        TelegramBotService.TelegramMessagePayload telegramMessage = new TelegramBotService.TelegramMessagePayload(
                payloadText,
                imageUrl,
                buttonText,
                buttonUrl
        );

        String storedTitle = title != null ? title : "Telegram уведомление";
        String storedMessage = buildStoredMessage(message, buttonText, buttonUrl);

        int recipients = userRepository.findByTelegramUserTrue().stream()
                .filter(user -> user.getTelegramUserId() != null)
                .mapToInt(user -> {
                    telegramBotService.sendMessage(user.getTelegramUserId(), telegramMessage);
                    Notification notification = new Notification();
                    notification.setTitle(storedTitle);
                    notification.setMessage(storedMessage);
                    notification.setType("TELEGRAM");
                    notification.setRead(false);
                    notification.setUser(user);
                    notificationRepository.save(notification);
                    return 1;
                })
                .sum();

        try {
            User currentUser = securityUtils.getCurrentUser();
            Notification adminLog = new Notification();
            adminLog.setTitle(storedTitle + " (Telegram)");
            adminLog.setMessage(buildAdminLogMessage(message, buttonText, buttonUrl, imageUrl, recipients));
            adminLog.setType("TELEGRAM_LOG");
            adminLog.setRead(false);
            adminLog.setUser(currentUser);
            notificationRepository.save(adminLog);
        } catch (Exception ex) {
            log.warn("Failed to register admin log for Telegram broadcast", ex);
        }

        return recipients;
    }

    private String buildTelegramMessage(String title, String message) {
        StringBuilder builder = new StringBuilder();
        if (title != null && !title.isBlank()) {
            builder.append("<b>").append(title).append("</b>\n\n");
        }
        builder.append(message != null ? message : "");
        return builder.toString();
    }

    private String buildStoredMessage(String message, String buttonText, String buttonUrl) {
        if (buttonText != null && buttonUrl != null) {
            return message + "\n\nКнопка: " + buttonText + " -> " + buttonUrl;
        }
        return message;
    }

    private String buildAdminLogMessage(String message, String buttonText, String buttonUrl, String imageUrl, int recipients) {
        StringBuilder builder = new StringBuilder("Получателей: ").append(recipients).append('\n');
        if (buttonText != null && buttonUrl != null) {
            builder.append("Кнопка: ").append(buttonText).append(" -> ").append(buttonUrl).append('\n');
        }
        if (imageUrl != null && !imageUrl.isBlank()) {
            builder.append("Изображение: ").append(imageUrl).append('\n');
        }
        builder.append('\n').append(message);
        return builder.toString();
    }

    private String sanitize(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private NotificationSettings createDefaultSettings(User user) {
        NotificationSettings settings = new NotificationSettings();
        settings.setUser(user);
        settings.setEmailEnabled(true);
        settings.setPushEnabled(true);
        settings.setSmsEnabled(false);
        settings.setOrderUpdates(true);
        settings.setPromotions(true);
        settings.setSystemUpdates(true);
        return settingsRepository.save(settings);
    }
}
