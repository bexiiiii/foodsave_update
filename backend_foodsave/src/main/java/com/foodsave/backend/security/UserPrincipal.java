package com.foodsave.backend.security;

import com.foodsave.backend.entity.User;
import com.foodsave.backend.domain.enums.UserRole;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;

@Data
@Slf4j
public class UserPrincipal implements UserDetails {
    private Long id;
    private String username;
    private String email;
    private String password;
    private boolean enabled;
    private Collection<? extends GrantedAuthority> authorities;
    private UserRole role; // Store single role instead of roles collection

    public static UserPrincipal create(User user) {
        UserPrincipal userPrincipal = new UserPrincipal();
        userPrincipal.setId(user.getId());
        userPrincipal.setUsername(user.getUsername());
        userPrincipal.setEmail(user.getEmail());
        userPrincipal.setPassword(user.getPassword());
        userPrincipal.setEnabled(user.isEnabled());
        userPrincipal.setRole(user.getRole()); // Store single role
        
        List<GrantedAuthority> authorities = List.of(
            new SimpleGrantedAuthority("ROLE_" + user.getRole().name())
        );
        userPrincipal.setAuthorities(authorities);
        
        log.debug("Created UserPrincipal for user: {}, role: {}", user.getUsername(), user.getRole());
        
        return userPrincipal;
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return authorities;
    }

    @Override
    public String getPassword() {
        return password;
    }

    @Override
    public String getUsername() {
        return username;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return enabled;
    }
}
