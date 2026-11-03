package com.foodsave.backend.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.util.UriUtils;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.util.Map;
import java.nio.charset.StandardCharsets;
import java.net.URI;
import java.security.Principal;

/** Proxies the private parser service without exposing its token to the browser. */
@RestController
@RequestMapping("/api/admin/whatsapp-parser")
@RequiredArgsConstructor
@PreAuthorize("hasRole('SUPER_ADMIN')")
public class WhatsAppParserAdminController {

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper;

    @Value("${whatsapp.parser.url:http://host.docker.internal:8000}")
    private String parserUrl;

    @Value("${whatsapp.parser.admin-token:}")
    private String parserAdminToken;

    @GetMapping("/events")
    public ResponseEntity<?> events() {
        return forward("/api/admin/events?limit=100", null, false);
    }

    @GetMapping("/review-queue")
    public ResponseEntity<?> reviewQueue() {
        return forward("/api/admin/review-queue", null, false);
    }

    @GetMapping("/catalog")
    public ResponseEntity<?> catalog() {
        return forward("/api/admin/catalog", null, false);
    }

    @GetMapping("/image")
    public ResponseEntity<byte[]> image(@RequestParam("path") String imagePath) {
        if (!isSafeImagePath(imagePath)) {
            return ResponseEntity.badRequest().build();
        }
        if (parserAdminToken == null || parserAdminToken.isBlank()) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).build();
        }

        HttpHeaders headers = new HttpHeaders();
        headers.set("X-Parser-Admin-Token", parserAdminToken);
        headers.setAccept(java.util.List.of(MediaType.IMAGE_JPEG, MediaType.IMAGE_PNG,
                MediaType.parseMediaType("image/webp"), MediaType.IMAGE_GIF));
        String encodedPath = UriUtils.encodePath(imagePath, StandardCharsets.UTF_8);
        URI target = URI.create(parserUrl.replaceAll("/$", "") + "/images/" + encodedPath);
        try {
            ResponseEntity<byte[]> response = restTemplate.exchange(
                    target, org.springframework.http.HttpMethod.GET,
                    new org.springframework.http.HttpEntity<>(headers), byte[].class);
            MediaType contentType = response.getHeaders().getContentType();
            if (!response.getStatusCode().is2xxSuccessful()) {
                return ResponseEntity.status(response.getStatusCode()).build();
            }
            if (response.getBody() == null || !isSafeImageContentType(contentType)) {
                return ResponseEntity.status(HttpStatus.BAD_GATEWAY).build();
            }
            HttpHeaders responseHeaders = new HttpHeaders();
            responseHeaders.setContentType(contentType);
            responseHeaders.setCacheControl("private, max-age=300");
            responseHeaders.set("X-Content-Type-Options", "nosniff");
            return new ResponseEntity<>(response.getBody(), responseHeaders, response.getStatusCode());
        } catch (org.springframework.web.client.HttpStatusCodeException exception) {
            return ResponseEntity.status(exception.getStatusCode()).build();
        } catch (RestClientException exception) {
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY).build();
        }
    }

    private boolean isSafeImagePath(String imagePath) {
        if (imagePath == null || imagePath.isBlank() || imagePath.startsWith("/")
                || imagePath.contains("\\") || imagePath.indexOf('\0') >= 0) {
            return false;
        }
        for (String segment : imagePath.split("/", -1)) {
            if (segment.isBlank() || segment.equals(".") || segment.equals("..")) return false;
        }
        return true;
    }

    private boolean isSafeImageContentType(MediaType contentType) {
        if (contentType == null || !"image".equalsIgnoreCase(contentType.getType())) return false;
        String subtype = contentType.getSubtype().toLowerCase();
        return subtype.equals("jpeg") || subtype.equals("jpg") || subtype.equals("png")
                || subtype.equals("webp") || subtype.equals("gif");
    }

    @PostMapping("/review-queue/edit")
    public ResponseEntity<?> editReviewItem(@RequestBody Map<String, Object> request, Principal principal) {
        return forward("/api/admin/review-queue/edit", request, true, principal.getName());
    }

    @PostMapping("/review-queue/publish")
    public ResponseEntity<?> publishReviewItem(@RequestBody Map<String, Object> request, Principal principal) {
        return forward("/api/admin/review-queue/publish", request, true, principal.getName());
    }

    @PostMapping("/review-queue/reject")
    public ResponseEntity<?> rejectReviewItem(@RequestBody Map<String, Object> request, Principal principal) {
        return forward("/api/admin/review-queue/reject", request, true, principal.getName());
    }

    @PostMapping("/review-queue/snooze")
    public ResponseEntity<?> snoozeReviewItem(@RequestBody Map<String, Object> request, Principal principal) {
        return forward("/api/admin/review-queue/snooze", request, true, principal.getName());
    }

    @PostMapping("/review-queue/reconcile-published")
    public ResponseEntity<?> reconcilePublished(@RequestBody Map<String, Object> request, Principal principal) {
        return forward("/api/admin/review-queue/reconcile-published", request, true, principal.getName());
    }

    @PostMapping("/review-queue/reconcile-not-published")
    public ResponseEntity<?> reconcileNotPublished(@RequestBody Map<String, Object> request, Principal principal) {
        return forward("/api/admin/review-queue/reconcile-not-published", request, true, principal.getName());
    }

    @PostMapping("/parse")
    public ResponseEntity<?> parse(@RequestBody Map<String, Object> request) {
        return forward("/api/admin/parse", request, true);
    }

    @PostMapping("/publish")
    public ResponseEntity<?> publish(@RequestBody Map<String, Object> request, Principal principal) {
        return forward("/api/admin/publish", request, true, principal.getName());
    }

    private ResponseEntity<?> forward(String path, Object body, boolean post) {
        return forward(path, body, post, null);
    }

    private ResponseEntity<?> forward(String path, Object body, boolean post, String actor) {
        if (parserAdminToken == null || parserAdminToken.isBlank()) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(Map.of("error", "WhatsApp parser integration is not configured"));
        }

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("X-Parser-Admin-Token", parserAdminToken);
        if (actor != null && !actor.isBlank()) headers.set("X-Parser-Actor", actor);
        String target = parserUrl.replaceAll("/$", "") + path;

        try {
            ResponseEntity<String> response = post
                    ? restTemplate.postForEntity(target, new org.springframework.http.HttpEntity<>(body, headers), String.class)
                    : restTemplate.exchange(target, org.springframework.http.HttpMethod.GET,
                    new org.springframework.http.HttpEntity<>(headers), String.class);
            return ResponseEntity.status(response.getStatusCode()).body(parseJson(response.getBody()));
        } catch (org.springframework.web.client.HttpStatusCodeException exception) {
            return ResponseEntity.status(exception.getStatusCode()).body(parseJson(exception.getResponseBodyAsString()));
        } catch (RestClientException exception) {
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                    .body(Map.of("error", "WhatsApp parser is unavailable"));
        }
    }

    private Object parseJson(String body) {
        try {
            JsonNode node = objectMapper.readTree(body == null ? "{}" : body);
            return node;
        } catch (Exception ignored) {
            return Map.of("error", "Invalid parser response");
        }
    }
}
