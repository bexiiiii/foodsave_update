package com.foodsave.backend.service;

import com.foodsave.backend.domain.enums.NotificationGroupStatus;
import com.foodsave.backend.entity.NotificationGroup;
import com.foodsave.backend.entity.User;
import com.foodsave.backend.repository.NotificationGroupRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class NotificationAttributionServiceTest {

    private final NotificationGroupRepository repository = mock(NotificationGroupRepository.class);
    private final NotificationAttributionService service = new NotificationAttributionService(repository);
    private final LocalDateTime sentAt = LocalDateTime.of(2026, 9, 29, 12, 0);
    private User currentUser;
    private NotificationGroup group;

    @BeforeEach
    void setUp() {
        currentUser = user(10L);
        group = new NotificationGroup();
        group.setId(42L);
        group.setUser(currentUser);
        group.setStatus(NotificationGroupStatus.SENT);
        group.setSentAt(sentAt);
        when(repository.findById(42L)).thenReturn(Optional.of(group));
    }

    @Test
    void acceptsSameUserAtInclusiveTwentyFourHourBoundary() {
        var result = service.resolve(42L, "notification_42", currentUser, sentAt.plusHours(24));

        assertTrue(result.valid());
        org.junit.jupiter.api.Assertions.assertEquals(42L, result.notificationGroupId());
        org.junit.jupiter.api.Assertions.assertEquals("notification_42", result.startParam());
    }

    @Test
    void rejectsAttributionAfterTwentyFourHours() {
        assertFalse(service.resolve(42L, "notification_42", currentUser,
                sentAt.plusHours(24).plusNanos(1)).valid());
    }

    @Test
    void rejectsDifferentUser() {
        assertFalse(service.resolve(42L, "notification_42", user(11L), sentAt.plusHours(1)).valid());
    }

    @Test
    void rejectsFutureNotification() {
        assertFalse(service.resolve(42L, "notification_42", currentUser, sentAt.minusNanos(1)).valid());
    }

    @Test
    void rejectsMismatchedOrMalformedStartParam() {
        assertFalse(service.resolve(42L, "notification_43", currentUser, sentAt.plusHours(1)).valid());
        assertFalse(service.resolve(42L, "notification_bad", currentUser, sentAt.plusHours(1)).valid());
    }

    @Test
    void rejectsGroupThatWasNotSent() {
        group.setStatus(NotificationGroupStatus.FAILED);
        assertFalse(service.resolve(42L, "notification_42", currentUser, sentAt.plusHours(1)).valid());
    }

    private User user(Long id) {
        User user = new User();
        user.setId(id);
        return user;
    }
}
