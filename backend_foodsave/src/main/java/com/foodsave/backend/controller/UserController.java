package com.foodsave.backend.controller;

import com.foodsave.backend.entity.User;
import com.foodsave.backend.dto.UserDTO;
import com.foodsave.backend.service.UserService;
import com.foodsave.backend.domain.enums.UserRole;
import com.foodsave.backend.domain.enums.Permission;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
@Tag(name = "User Management", description = "APIs for managing users")
@CrossOrigin(origins = "*", maxAge = 3600)
public class UserController {
    
    private final UserService userService;
    
    @GetMapping("/check-admin")
    @Operation(summary = "Check admin users")
    public ResponseEntity<List<UserDTO>> checkAdminUsers() {
        return ResponseEntity.ok(userService.getUsersByRole(UserRole.SUPER_ADMIN));
    }
    
    @GetMapping
    @Operation(summary = "Get all users")
    // @RequirePermission(Permission.USER_READ)
    public ResponseEntity<List<UserDTO>> getAllUsers() {
        return ResponseEntity.ok(userService.getAllUsers());
    }
    
    @GetMapping("/paginated")
    @Operation(summary = "Get all users with pagination")
    @PreAuthorize("hasRole('ADMIN') or hasRole('SUPER_ADMIN')")
    public ResponseEntity<Page<UserDTO>> getAllUsers(Pageable pageable) {
        Page<UserDTO> users = userService.getAllUsers(pageable);
        return ResponseEntity.ok(users);
    }
    
    @GetMapping("/{id}")
    @Operation(summary = "Get user by ID")
    // @RequirePermission(Permission.USER_READ)
    public ResponseEntity<UserDTO> getUserById(@PathVariable Long id) {
        return ResponseEntity.ok(userService.getUserById(id));
    }
    
    @GetMapping("/email/{email}")
    @Operation(summary = "Get user by email")
    public ResponseEntity<UserDTO> getUserByEmail(@PathVariable String email) {
        UserDTO user = userService.getUserByEmail(email);
        return ResponseEntity.ok(user);
    }
    
    @GetMapping("/role/{role}")
    @Operation(summary = "Get users by role")
    @PreAuthorize("hasRole('ADMIN') or hasRole('SUPER_ADMIN')")
    public ResponseEntity<List<UserDTO>> getUsersByRole(@PathVariable UserRole role) {
        List<UserDTO> users = userService.getUsersByRole(role);
        return ResponseEntity.ok(users);
    }
    
    @GetMapping("/profile")
    public ResponseEntity<UserDTO> getCurrentUserProfile() {
        return ResponseEntity.ok(userService.getCurrentUserProfile());
    }
    
    @PutMapping("/profile/update")
    public ResponseEntity<UserDTO> updateUserProfile(@RequestBody UserDTO userDTO) {
        return ResponseEntity.ok(userService.updateUserProfile(userDTO));
    }
    
    @PostMapping
    @Operation(summary = "Create a new user")
    public ResponseEntity<UserDTO> createUser(@Valid @RequestBody UserDTO userDTO) {
        UserDTO createdUser = userService.createUser(userDTO);
        return ResponseEntity.ok(createdUser);
    }
    
    @PutMapping("/{id}")
    @Operation(summary = "Update an existing user")
    // @RequirePermission(Permission.USER_UPDATE)
    public ResponseEntity<UserDTO> updateUser(@PathVariable Long id, @Valid @RequestBody UserDTO userDTO) {
        return ResponseEntity.ok(userService.updateUser(id, userDTO));
    }
    
    @DeleteMapping("/{id}")
    @Operation(summary = "Delete a user")
    // @RequirePermission(Permission.USER_DELETE)
    public ResponseEntity<Void> deleteUser(@PathVariable Long id) {
        userService.deleteUser(id);
        return ResponseEntity.ok().build();
    }
    
    @PutMapping("/{id}/role")
    @Operation(summary = "Update user role")
    // @RequirePermission(Permission.USER_UPDATE)
    public ResponseEntity<UserDTO> updateUserRole(@PathVariable Long id, @RequestParam UserRole role) {
        return ResponseEntity.ok(userService.updateUserRole(id, role));
    }
    
    @PutMapping("/{id}/status")
    @Operation(summary = "Update user status")
    // @RequirePermission(Permission.USER_UPDATE)
    public ResponseEntity<UserDTO> updateUserStatus(@PathVariable Long id, @RequestParam boolean active) {
        return ResponseEntity.ok(userService.updateUserStatus(id, active));
    }
    
    @PatchMapping("/{id}/toggle-status")
    @Operation(summary = "Toggle user enabled status")
    @PreAuthorize("hasRole('ADMIN') or hasRole('SUPER_ADMIN')")
    public ResponseEntity<UserDTO> toggleUserStatus(@PathVariable Long id) {
        UserDTO user = userService.toggleUserStatus(id);
        return ResponseEntity.ok(user);
    }
    
    @PutMapping("/change-password")
    public ResponseEntity<Void> changePassword(@RequestBody String newPassword) {
        userService.changePassword(newPassword);
        return ResponseEntity.ok().build();
    }
    
    @PostMapping("/forgot-password")
    public ResponseEntity<Void> forgotPassword(@RequestBody String email) {
        userService.sendPasswordResetEmail(email);
        return ResponseEntity.ok().build();
    }
    
    @PostMapping("/reset-password")
    public ResponseEntity<Void> resetPassword(@RequestParam String token, @RequestBody String newPassword) {
        userService.resetPassword(token, newPassword);
        return ResponseEntity.ok().build();
    }
    
    @GetMapping("/available-managers")
    @Operation(summary = "Get available users for manager assignment")
    @PreAuthorize("permitAll()")
    public ResponseEntity<List<UserDTO>> getAvailableManagers() {
        List<UserDTO> availableManagers = userService.getAvailableManagers();
        return ResponseEntity.ok(availableManagers);
    }
}
