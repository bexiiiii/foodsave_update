package com.foodsave.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.foodsave.backend.domain.enums.UserRole;
import com.foodsave.backend.dto.AuthResponseDTO;
import com.foodsave.backend.entity.User;
import com.foodsave.backend.exception.ApiException;
import com.foodsave.backend.repository.UserRepository;
import com.foodsave.backend.security.JwtTokenProvider;
import com.foodsave.backend.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class TelegramAuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final ObjectMapper objectMapper;

    @Value("${telegram.bot.token:}")
    private String botToken;

    @Transactional
    public AuthResponseDTO authenticate(String initData) {
        if (initData == null || initData.isBlank()) {
            throw new IllegalArgumentException("Telegram initData must not be empty");
        }
        if (botToken == null || botToken.isBlank()) {
            throw new IllegalStateException("Telegram bot token is not configured");
        }

        Map<String, String> payload = parseInitData(initData);
        validateHash(payload);
        validateAuthDate(payload);

        String userJson = payload.get("user");
        if (userJson == null || userJson.isBlank()) {
            throw new IllegalArgumentException("Telegram payload missing user information");
        }

        TelegramUserInfo telegramUserInfo = parseUserInfo(userJson);
        User user = userRepository.findByTelegramUserId(telegramUserInfo.id())
                .orElseGet(() -> createTelegramUser(telegramUserInfo));

        String firstName = coalesceNonBlank(
                telegramUserInfo.firstName(),
                user.getFirstName(),
                "Telegram"
        );
        user.setFirstName(firstName);

        String lastName = coalesceNonBlank(
                telegramUserInfo.lastName(),
                user.getLastName(),
                firstName,
                "User"
        );
        user.setLastName(lastName);
        user.setTelegramUsername(coalesceNonBlank(telegramUserInfo.username(), user.getTelegramUsername()));
        user.setTelegramPhotoUrl(telegramUserInfo.photoUrl());
        user.setTelegramLanguageCode(coalesceNonBlank(telegramUserInfo.languageCode(), user.getTelegramLanguageCode()));
        user.setTelegramDataRaw(initData);
        if (user.getEmail() == null || user.getEmail().isBlank()) {
            user.setEmail(generateEmail(telegramUserInfo));
        }

        if (user.getTelegramRegisteredAt() == null) {
            user.setTelegramRegisteredAt(LocalDateTime.now());
        }
        user.setTelegramUser(true);
        user.setActive(true);
        user.setEnabled(true);
        user.setRole(user.getRole() != null ? user.getRole() : UserRole.CUSTOMER);
        user.setRegistrationSource("TELEGRAM");

        userRepository.save(user);

        UserPrincipal principal = UserPrincipal.create(user);
        Authentication authentication = new UsernamePasswordAuthenticationToken(
                principal, null, principal.getAuthorities());
        String jwt = jwtTokenProvider.generateToken(authentication);

        return new AuthResponseDTO(jwt, null, com.foodsave.backend.dto.UserDTO.fromEntity(user));
    }

    private Map<String, String> parseInitData(String initData) {
        Map<String, String> params = new HashMap<>();
        for (String pair : initData.split("&")) {
            String[] keyValue = pair.split("=", 2);
            if (keyValue.length == 2) {
                String key = keyValue[0];
                String value = java.net.URLDecoder.decode(keyValue[1], StandardCharsets.UTF_8);
                params.put(key, value);
            }
        }
        return params;
    }

    private void validateHash(Map<String, String> payload) {
        String receivedHash = payload.get("hash");
        if (receivedHash == null) {
            throw new IllegalArgumentException("Telegram payload missing hash");
        }

        List<String> dataCheckList = payload.entrySet().stream()
                .filter(entry -> !"hash".equals(entry.getKey()))
                .sorted(Map.Entry.comparingByKey())
                .map(entry -> entry.getKey() + "=" + entry.getValue())
                .toList();
        String dataCheckString = String.join("\n", dataCheckList);

        log.info("DEBUG Telegram Auth - Data check string: {}", dataCheckString);
        log.info("DEBUG Telegram Auth - Received hash: {}", receivedHash);
        log.info("DEBUG Telegram Auth - Bot token length: {}", botToken.length());

        byte[] secretKey = hmacSha256(
                "WebAppData".getBytes(StandardCharsets.UTF_8),
                botToken.getBytes(StandardCharsets.UTF_8)
        );
        String calculatedHash = hmacSha256Hex(secretKey, dataCheckString);

        log.info("DEBUG Telegram Auth - Calculated hash: {}", calculatedHash);

        if (!calculatedHash.equalsIgnoreCase(receivedHash)) {
            log.error("Hash validation failed! Expected: {}, Got: {}", calculatedHash, receivedHash);
            throw new ApiException("Invalid Telegram init data hash", HttpStatus.UNAUTHORIZED);
        }
        
        log.info("DEBUG Telegram Auth - Hash validation successful");
    }

    private void validateAuthDate(Map<String, String> payload) {
        String authDate = payload.get("auth_date");
        if (authDate == null) {
            return;
        }
        long authTimestamp = Long.parseLong(authDate);
        Instant authInstant = Instant.ofEpochSecond(authTimestamp);
        Instant now = Instant.now();
        if (now.minusSeconds(86400).isAfter(authInstant)) {
            throw new IllegalArgumentException("Telegram init data is too old");
        }
    }

    private TelegramUserInfo parseUserInfo(String userJson) {
        try {
            JsonNode root = objectMapper.readTree(userJson);
            long id = root.path("id").asLong();
            if (id == 0) {
                throw new IllegalArgumentException("Telegram user id missing");
            }
            String firstName = root.path("first_name").asText(null);
            String lastName = root.path("last_name").asText(null);
            String username = root.path("username").asText(null);
            String languageCode = root.path("language_code").asText(null);
            String photoUrl = root.path("photo_url").asText(null);
            return new TelegramUserInfo(id, firstName, lastName, username, languageCode, photoUrl);
        } catch (Exception e) {
            throw new IllegalArgumentException("Unable to parse Telegram user info", e);
        }
    }

    private User createTelegramUser(TelegramUserInfo info) {
        User user = new User();
        user.setTelegramUserId(info.id());
        String firstName = coalesceNonBlank(info.firstName(), "Telegram");
        user.setFirstName(firstName);
        String lastName = coalesceNonBlank(info.lastName(), firstName, "User");
        user.setLastName(lastName);
        user.setEmail(generateEmail(info));
        user.setRole(UserRole.CUSTOMER);
        user.setActive(true);
        user.setEnabled(true);
        user.setRegistrationSource("TELEGRAM");
        user.setPassword(passwordEncoder.encode(UUID.randomUUID().toString()));
        user.setTelegramRegisteredAt(LocalDateTime.now());
        return user;
    }

    private String generateEmail(TelegramUserInfo info) {
        String base = coalesceNonBlank(info.username(), "telegram" + info.id());
        return base.toLowerCase(Locale.ROOT) + "@telegram.local";
    }

    private String hmacSha256Hex(byte[] key, String data) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(key, "HmacSHA256"));
            byte[] result = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            return bytesToHex(result);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to compute HMAC-SHA256", e);
        }
    }

    private byte[] hmacSha256(byte[] key, byte[] data) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(key, "HmacSHA256"));
            return mac.doFinal(data);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to compute HMAC-SHA256", e);
        }
    }

    private String bytesToHex(byte[] bytes) {
        StringBuilder hexString = new StringBuilder();
        for (byte b : bytes) {
            String hex = Integer.toHexString(0xff & b);
            if (hex.length() == 1) {
                hexString.append('0');
            }
            hexString.append(hex);
        }
        return hexString.toString();
    }

    private record TelegramUserInfo(long id,
                                    String firstName,
                                    String lastName,
                                    String username,
                                    String languageCode,
                                    String photoUrl) {
    }

    private String coalesceNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value;
            }
        }
        return null;
    }
}
