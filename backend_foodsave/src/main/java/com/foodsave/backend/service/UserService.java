package com.foodsave.backend.service;

import com.foodsave.backend.entity.User;
import com.foodsave.backend.dto.UserDTO;
import com.foodsave.backend.repository.UserRepository;
import com.foodsave.backend.domain.enums.UserRole;
import com.foodsave.backend.security.UserPrincipal;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.core.Authentication;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;

    public List<UserDTO> getAllUsers() {
        return userRepository.findAll().stream()
                .map(UserDTO::fromEntity)
                .collect(Collectors.toList());
    }

    public Page<UserDTO> getAllUsers(Pageable pageable) {
        return userRepository.findAll(pageable)
                .map(UserDTO::fromEntity);
    }

    public UserDTO getUserById(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("User not found"));
        return UserDTO.fromEntity(user);
    }

    public UserDTO getCurrentUserProfile() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return UserDTO.fromEntity(user);
    }

    public UserDTO getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        
        if (authentication != null && authentication.getPrincipal() instanceof UserPrincipal) {
            UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
            
            // Получаем полную информацию о пользователе из базы данных
            User user = userRepository.findById(userPrincipal.getId())
                .orElseThrow(() -> new RuntimeException("User not found"));
            
            return UserDTO.fromEntity(user);
        }
        
        throw new RuntimeException("User not authenticated");
    }

    public UserDTO updateUserProfile(UserDTO userDTO) {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
        updateUserFromDTO(user, userDTO);
        return UserDTO.fromEntity(userRepository.save(user));
    }

    public UserDTO createUser(UserDTO userDTO) {
        if (userRepository.findByEmail(userDTO.getEmail()).isPresent()) {
            throw new RuntimeException("User with this email already exists");
        }

        User user = new User();
        updateUserFromDTO(user, userDTO);
        
        if (user.getRole() == null) {
            user.setRole(UserRole.CUSTOMER);
        }

        user.setActive(true);
        if (user.getRegistrationSource() == null) {
            user.setRegistrationSource("ADMIN");
        }

        if (userDTO.getPassword() != null && !userDTO.getPassword().isEmpty()) {
            user.setPassword(passwordEncoder.encode(userDTO.getPassword()));
        } else {
            throw new RuntimeException("Password is required");
        }
        
        return UserDTO.fromEntity(userRepository.save(user));
    }

    public UserDTO updateUser(Long id, UserDTO userDTO) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("User not found"));
        updateUserFromDTO(user, userDTO);
        if (userDTO.getPassword() != null && !userDTO.getPassword().isEmpty()) {
            user.setPassword(passwordEncoder.encode(userDTO.getPassword()));
        }
        return UserDTO.fromEntity(userRepository.save(user));
    }

    public void deleteUser(Long id) {
        userRepository.deleteById(id);
    }

    public void changePassword(String newPassword) {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
    }

    public void sendPasswordResetEmail(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
        String token = generateResetToken();
        user.setResetToken(token);
        userRepository.save(user);
        emailService.sendPasswordResetEmail(email, token);
    }

    public void resetPassword(String token, String newPassword) {
        User user = userRepository.findByResetToken(token)
                .orElseThrow(() -> new RuntimeException("Invalid reset token"));
        user.setPassword(passwordEncoder.encode(newPassword));
        user.setResetToken(null);
        userRepository.save(user);
    }

    private void updateUserFromDTO(User user, UserDTO dto) {
        if (dto.getFirstName() != null) {
            user.setFirstName(dto.getFirstName());
        }
        if (dto.getLastName() != null) {
            user.setLastName(dto.getLastName());
        }
        if (dto.getEmail() != null) {
            user.setEmail(dto.getEmail());
        }
        if (dto.getPhone() != null) {
            user.setPhone(dto.getPhone());
        }
        if (dto.getProfilePicture() != null) {
            user.setProfilePicture(dto.getProfilePicture());
        }
        if (dto.getAddress() != null) {
            user.setAddress(dto.getAddress());
        }
        if (dto.getRole() != null) {
            user.setRole(dto.getRole());
        }
        if (dto.getActive() != null) {
            user.setActive(dto.getActive());
        }
        if (dto.getRegistrationSource() != null) {
            user.setRegistrationSource(dto.getRegistrationSource());
        }
        if (dto.getTelegramUser() != null) {
            user.setTelegramUser(dto.getTelegramUser());
        }
        if (dto.getTelegramUserId() != null) {
            user.setTelegramUserId(dto.getTelegramUserId());
        }
        if (dto.getTelegramUsername() != null) {
            user.setTelegramUsername(dto.getTelegramUsername());
        }
        if (dto.getTelegramPhotoUrl() != null) {
            user.setTelegramPhotoUrl(dto.getTelegramPhotoUrl());
        }
        if (dto.getTelegramLanguageCode() != null) {
            user.setTelegramLanguageCode(dto.getTelegramLanguageCode());
        }
        if (dto.getTelegramRegisteredAt() != null) {
            user.setTelegramRegisteredAt(dto.getTelegramRegisteredAt());
        }
    }

    private String generateResetToken() {
        return java.util.UUID.randomUUID().toString();
    }

    public UserDTO getUserByEmail(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return UserDTO.fromEntity(user);
    }

    @Transactional
    public UserDTO toggleUserStatus(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));
        user.setActive(!user.isActive());
        user = userRepository.save(user);
        return UserDTO.fromEntity(user);
    }

    public List<UserDTO> getUsersByRole(UserRole role) {
        return userRepository.findByRole(role).stream()
                .map(UserDTO::fromEntity)
                .collect(Collectors.toList());
    }

    public UserDTO updateUserRole(Long id, UserRole role) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));
        user.setRole(role);
        return UserDTO.fromEntity(userRepository.save(user));
    }

    public UserDTO updateUserStatus(Long id, boolean active) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));
        user.setActive(active);
        return UserDTO.fromEntity(userRepository.save(user));
    }

    public List<UserDTO> getAvailableManagers() {
        // Получаем пользователей с ролью STORE_MANAGER, которые могут быть назначены менеджерами
        List<User> availableUsers = userRepository.findByRole(UserRole.STORE_MANAGER);
        return availableUsers.stream()
                .map(UserDTO::fromEntity)
                .collect(Collectors.toList());
    }
}
