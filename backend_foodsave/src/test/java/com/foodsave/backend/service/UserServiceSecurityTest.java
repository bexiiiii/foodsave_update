package com.foodsave.backend.service;

import com.foodsave.backend.domain.enums.UserRole;
import com.foodsave.backend.dto.UserDTO;
import com.foodsave.backend.entity.User;
import com.foodsave.backend.repository.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserServiceSecurityTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private EmailService emailService;

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void profileUpdateCannotEscalateRoleOrChangeSecurityFields() {
        User user = new User();
        user.setId(42L);
        user.setFirstName("Customer");
        user.setLastName("User");
        user.setEmail("customer@example.com");
        user.setPassword("encoded");
        user.setRole(UserRole.CUSTOMER);
        user.setActive(true);
        user.setEnabled(true);

        when(userRepository.findByEmail("customer@example.com")).thenReturn(Optional.of(user));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("customer@example.com", null));

        UserDTO malicious = new UserDTO();
        malicious.setFirstName("Updated");
        malicious.setRole(UserRole.SUPER_ADMIN);
        malicious.setActive(false);
        malicious.setEmail("admin@example.com");
        malicious.setTelegramUserId(999999L);
        malicious.setRegistrationSource("ADMIN");

        UserDTO result = new UserService(userRepository, passwordEncoder, emailService)
                .updateUserProfile(malicious);

        assertEquals("Updated", result.getFirstName());
        assertEquals(UserRole.CUSTOMER, user.getRole());
        assertTrue(user.isActive());
        assertEquals("customer@example.com", user.getEmail());
        assertNull(user.getTelegramUserId());
        assertNull(user.getRegistrationSource());
    }
}
