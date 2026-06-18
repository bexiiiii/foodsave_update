package com.foodsave.backend.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class EmailService {
    
    public void sendPasswordResetEmail(String email, String token) {
        // TODO: Implement email sending
        System.out.println("Password reset email would be sent to: " + email + " with token: " + token);
    }
    
    public void sendVerificationEmail(String email, String token) {
        // TODO: Implement email sending
        System.out.println("Verification email would be sent to: " + email + " with token: " + token);
    }
} 