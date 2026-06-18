package com.foodsave.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuthResponse {
    
    private String token;
    @Builder.Default
    private String type = "Bearer";
    private UserDTO user;
    
    public AuthResponse(String token, UserDTO user) {
        this.token = token;
        this.user = user;
    }
}
