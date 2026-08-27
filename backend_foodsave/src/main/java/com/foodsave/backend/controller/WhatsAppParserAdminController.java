package com.foodsave.backend.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

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

    @PostMapping("/parse")
    public ResponseEntity<?> parse(@RequestBody Map<String, Object> request) {
        return forward("/api/admin/parse", request, true);
    }

    @PostMapping("/publish")
    public ResponseEntity<?> publish(@RequestBody Map<String, Object> request) {
        return forward("/api/admin/publish", request, true);
    }

    private ResponseEntity<?> forward(String path, Object body, boolean post) {
        if (parserAdminToken == null || parserAdminToken.isBlank()) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(Map.of("error", "WhatsApp parser integration is not configured"));
        }

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("X-Parser-Admin-Token", parserAdminToken);
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
