package com.foodsave.backend.service;
import com.foodsave.backend.domain.enums.UserRole;
import com.foodsave.backend.dto.AuthRequestDTO;
import com.foodsave.backend.dto.AuthResponseDTO;
import com.foodsave.backend.dto.RegisterRequestDTO;
import com.foodsave.backend.dto.UserDTO;
import com.foodsave.backend.entity.User;
import com.foodsave.backend.exception.ApiException;
import com.foodsave.backend.repository.UserRepository;
import com.foodsave.backend.security.JwtTokenProvider;
import com.foodsave.backend.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final EmailService emailService;

    public AuthResponseDTO login(AuthRequestDTO request) {
        User user = userRepository.findByEmail(request.getEmail())
            .orElseThrow(() -> new ApiException("Invalid email or password", HttpStatus.UNAUTHORIZED));

        if (!user.isActive()) {
            throw new ApiException("Account is inactive. Please contact support.", HttpStatus.UNAUTHORIZED);
        }

        Authentication authentication = authenticationManager.authenticate(
            new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
        );

        SecurityContextHolder.getContext().setAuthentication(authentication);
        String jwt = jwtTokenProvider.generateToken(authentication);

        return new AuthResponseDTO(jwt, null, UserDTO.fromEntity(user));
    }

    public AuthResponseDTO register(RegisterRequestDTO request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new ApiException("Email is already registered", HttpStatus.BAD_REQUEST);
        }

        User user = new User();
        user.setFirstName(request.getFirstName());
        user.setLastName(request.getLastName());
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setRole(UserRole.CUSTOMER);
        user.setActive(true);
        user.setEnabled(true);
        user.setRegistrationSource("WEB");

        userRepository.save(user);

        UserPrincipal userPrincipal = UserPrincipal.create(user);
        Authentication authentication = new UsernamePasswordAuthenticationToken(
            userPrincipal, null, userPrincipal.getAuthorities()
        );
        String jwt = jwtTokenProvider.generateToken(authentication);

        return new AuthResponseDTO(jwt, null, UserDTO.fromEntity(user));
    }

    public void verifyEmail(String token) {
        User user = userRepository.findByVerificationToken(token)
            .orElseThrow(() -> new ApiException("Invalid verification token", HttpStatus.BAD_REQUEST));

        user.setActive(true);
        userRepository.save(user);
    }

    public AuthResponseDTO refreshToken(String refreshToken) {
        if (!jwtTokenProvider.validateToken(refreshToken)) {
            throw new ApiException("Invalid refresh token", HttpStatus.UNAUTHORIZED);
        }

        String email = jwtTokenProvider.getUsernameFromToken(refreshToken);
        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new ApiException("User not found", HttpStatus.NOT_FOUND));

        UserPrincipal userPrincipal = UserPrincipal.create(user);
        Authentication authentication = new UsernamePasswordAuthenticationToken(
            userPrincipal, null, userPrincipal.getAuthorities()
        );

        String newJwt = jwtTokenProvider.generateToken(authentication);

        return new AuthResponseDTO(newJwt, null, UserDTO.fromEntity(user));
    }

    public void logout() {
        SecurityContextHolder.clearContext();
    }

    public AuthResponseDTO createDevToken(String roleStr) {
        // Только для разработки - используем реального пользователя из БД
        UserRole role;
        try {
            role = UserRole.valueOf(roleStr.toUpperCase());
        } catch (IllegalArgumentException e) {
            role = UserRole.STORE_MANAGER;
        }

        // Находим пользователя с нужной ролью
        String email;
        if (role == UserRole.SUPER_ADMIN) {
            email = "admin@example.com";
        } else {
            email = "dev@example.com";
        }

        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new ApiException("Dev user not found", HttpStatus.NOT_FOUND));

        UserPrincipal userPrincipal = UserPrincipal.create(user);
        Authentication authentication = new UsernamePasswordAuthenticationToken(
            userPrincipal, null, userPrincipal.getAuthorities()
        );

        String jwt = jwtTokenProvider.generateToken(authentication);

        return new AuthResponseDTO(jwt, null, UserDTO.fromEntity(user));
    }
}
