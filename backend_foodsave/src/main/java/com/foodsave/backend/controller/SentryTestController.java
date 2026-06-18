package com.foodsave.backend.controller;

import io.sentry.Sentry;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Test endpoint for Sentry error tracking
 * This controller provides endpoints to test Sentry integration
 */
@Slf4j
@RestController
@RequestMapping("/api/test")
public class SentryTestController {

    /**
     * Test endpoint to trigger a Sentry error report
     * Access: GET /api/test/sentry
     */
    @GetMapping("/sentry")
    public ResponseEntity<Map<String, String>> testSentry() {
        try {
            log.info("Testing Sentry integration...");
            
            // Create a test exception
            throw new RuntimeException("This is a test exception for Sentry integration");
            
        } catch (Exception e) {
            // Capture exception in Sentry
            Sentry.captureException(e);
            log.error("Test exception captured and sent to Sentry", e);
            
            return ResponseEntity.ok(Map.of(
                "status", "error_sent_to_sentry",
                "message", "Test exception has been captured and sent to Sentry",
                "exception", e.getMessage()
            ));
        }
    }

    /**
     * Test endpoint to send a custom message to Sentry
     * Access: GET /api/test/sentry-message
     */
    @GetMapping("/sentry-message")
    public ResponseEntity<Map<String, String>> testSentryMessage() {
        log.info("Sending test message to Sentry...");
        
        // Send a custom message to Sentry
        Sentry.captureMessage("Test message from FoodSave Backend - Sentry is working!");
        
        return ResponseEntity.ok(Map.of(
            "status", "success",
            "message", "Test message sent to Sentry successfully"
        ));
    }

    /**
     * Health check endpoint
     * Access: GET /api/test/health
     */
    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> health() {
        return ResponseEntity.ok(Map.of(
            "status", "healthy",
            "service", "foodsave-backend",
            "sentry", "enabled"
        ));
    }
}
