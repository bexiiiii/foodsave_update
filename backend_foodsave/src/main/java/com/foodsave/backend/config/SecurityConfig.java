package com.foodsave.backend.config;

import com.foodsave.backend.security.JwtAuthenticationFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.config.annotation.web.configuration.WebSecurityCustomizer;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.security.config.http.SessionCreationPolicy;
import jakarta.servlet.http.HttpServletResponse;

import java.util.Arrays;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity(prePostEnabled = true)
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .authorizeHttpRequests(auth -> auth

                // Always allow CORS preflight checks
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()

                // Swagger UI
                .requestMatchers("/swagger-ui/**").permitAll()
                .requestMatchers("/swagger-ui.html").permitAll()
                .requestMatchers("/v3/api-docs/**").permitAll()
                .requestMatchers("/swagger-resources/**").permitAll()
                .requestMatchers("/webjars/**").permitAll()

                // Static uploads
                .requestMatchers("/uploads/**").permitAll()
                .requestMatchers("/api/uploads/**").permitAll()
                
                // Auth endpoints - только регистрация и логин
                .requestMatchers("/api/auth/login").permitAll()
                .requestMatchers("/api/auth/register").permitAll()
                .requestMatchers("/api/auth/telegram/**").permitAll()
                .requestMatchers("/api/auth/refresh").permitAll()
                
                // Telegram webhooks - only Telegram servers should call these endpoints
                .requestMatchers("/api/telegram/webhook/**").permitAll()
                
                // ЗАКРЫТО: /api/users/** требует аутентификации
                // ЗАКРЫТО: /api/permissions/** требует аутентификации
                
                // Mini App endpoints - require authentication via Telegram WebApp
                .requestMatchers("/api/miniapp/**").authenticated()
                
                // Public product endpoints - ТОЛЬКО GET для чтения
                .requestMatchers(HttpMethod.GET, "/api/products/featured").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/products/categories").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/products/store/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/products/*").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/products").permitAll()
                // ЗАКРЫТО: POST/PUT/DELETE требуют аутентификации
                .requestMatchers(HttpMethod.POST, "/api/products/**").authenticated()
                .requestMatchers(HttpMethod.PUT, "/api/products/**").authenticated()
                .requestMatchers(HttpMethod.DELETE, "/api/products/**").authenticated()
                .requestMatchers(HttpMethod.GET, "/api/categories/**").permitAll()
                
                // Public store endpoints - только GET
                .requestMatchers(HttpMethod.GET, "/api/stores/*").permitAll()
                
                // Actuator - только health endpoint
                .requestMatchers("/actuator/health").permitAll()
                .requestMatchers("/actuator/**").denyAll()
                
                // All other requests need authentication
                .anyRequest().authenticated()
            )
            .sessionManagement(session -> session
                .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
            )
            .exceptionHandling(exception -> exception
                .authenticationEntryPoint((request, response, authException) -> {
                    response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                    response.getWriter().write("Unauthorized: " + authException.getMessage());
                })
                .accessDeniedHandler((request, response, accessDeniedException) -> {
                    response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                    response.getWriter().write("Access denied: " + accessDeniedException.getMessage());
                })
            )
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public WebSecurityCustomizer webSecurityCustomizer() {
        return (web) -> web.ignoring().requestMatchers("/uploads/**", "/api/uploads/**");
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(Arrays.asList(
            "https://foodsave.kz",
            "https://miniapp.foodsave.kz",
            "https://admin.foodsave.kz",
            "https://partner.foodsave.kz",
            "https://vendor.foodsave.kz",
            "https://web.telegram.org",
            "https://miniapp.telegram.org",
            "https://t.me",
            "http://localhost:3000",
            "http://localhost:3001",
            "http://localhost:3002",
            "http://192.168.8.147:3000",
            "http://vendor.foodsave.kz"
        ));
        configuration.setAllowedOriginPatterns(Arrays.asList(
            "https://*.foodsave.kz",
            "https://*.telegram.org"
        ));
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(Arrays.asList("*"));
        configuration.setExposedHeaders(Arrays.asList("Authorization"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);
        
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
