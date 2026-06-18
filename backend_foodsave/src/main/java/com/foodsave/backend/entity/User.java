package com.foodsave.backend.entity;

import com.foodsave.backend.domain.enums.UserRole;
import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.HashSet;
import java.util.Set;
import java.util.stream.Collectors;

@Data
@Entity
@NoArgsConstructor
@Table(name = "users")
@EqualsAndHashCode(callSuper = true)
public class User extends BaseEntity implements UserDetails {

    @NotBlank
    @Size(max = 50)
    @Column(nullable = false)
    private String firstName;

    @NotBlank
    @Size(max = 50)
    @Column(nullable = false)
    private String lastName;

    @NotBlank
    @Email
    @Size(max = 100)
    @Column(nullable = false, unique = true)
    private String email;

    @NotBlank
    @Size(max = 120)
    @Column(nullable = false)
    private String password;

    @Size(max = 20)
    private String phone;

    private String profilePicture;

    @Size(max = 200)
    private String address;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private UserRole role;

    @Column(name = "registration_source")
    private String registrationSource;

    @Column(name = "enabled", nullable = false)
    private boolean enabled = true;

    @Column(name = "active")
    private boolean active = true;

    @Column(name = "reset_token")
    private String resetToken;

    @Column(name = "verification_token")
    private String verificationToken;

    @Column(name = "telegram_user_id", unique = true)
    private Long telegramUserId;

    @Column(name = "telegram_username")
    private String telegramUsername;

    @Column(name = "telegram_photo_url")
    private String telegramPhotoUrl;

    @Column(name = "telegram_language_code")
    private String telegramLanguageCode;

    @Column(name = "telegram_registered_at")
    private LocalDateTime telegramRegisteredAt;

    @Column(name = "telegram_data_raw", columnDefinition = "TEXT")
    private String telegramDataRaw;

    @Column(name = "is_telegram_user", nullable = false)
    private boolean telegramUser = false;

    @OneToMany(mappedBy = "owner", cascade = CascadeType.ALL)
    private Set<Store> stores = new HashSet<>();

    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL)
    private Set<Order> orders = new HashSet<>();

    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL)
    private Set<Review> reviews = new HashSet<>();

    public void addStore(Store store) {
        stores.add(store);
        store.setOwner(this);
    }

    public void removeStore(Store store) {
        stores.remove(store);
        store.setOwner(null);
    }

    public void addOrder(Order order) {
        orders.add(order);
        order.setUser(this);
    }

    public void removeOrder(Order order) {
        orders.remove(order);
        order.setUser(null);
    }

    public void addReview(Review review) {
        reviews.add(review);
        review.setUser(this);
    }

    public void removeReview(Review review) {
        reviews.remove(review);
        review.setUser(null);
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return Set.of(new SimpleGrantedAuthority("ROLE_" + role.name()));
    }

    @Override
    public String getUsername() {
        return email;
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
