package com.foodsave.backend.security;

import com.foodsave.backend.domain.enums.UserRole;
import com.foodsave.backend.entity.User;
import com.foodsave.backend.exception.AccessDeniedException;
import com.foodsave.backend.repository.StoreRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthorizationServiceTest {

    @Mock
    private SecurityUtils securityUtils;
    @Mock
    private StoreRepository storeRepository;

    @Test
    void customerCannotManageArbitraryStore() {
        User customer = user(10L, UserRole.CUSTOMER);
        when(securityUtils.getCurrentUser()).thenReturn(customer);
        when(storeRepository.existsByIdAndOwnerId(99L, 10L)).thenReturn(false);
        when(storeRepository.existsByIdAndManagerId(99L, 10L)).thenReturn(false);

        AuthorizationService service = new AuthorizationService(securityUtils, storeRepository);

        assertThrows(AccessDeniedException.class, () -> service.requireCanManageStore(99L));
    }

    @Test
    void ownerCanManageOnlyOwnedStore() {
        User owner = user(10L, UserRole.STORE_OWNER);
        when(securityUtils.getCurrentUser()).thenReturn(owner);
        when(storeRepository.existsByIdAndOwnerId(7L, 10L)).thenReturn(true);

        AuthorizationService service = new AuthorizationService(securityUtils, storeRepository);

        assertDoesNotThrow(() -> service.requireCanManageStore(7L));
        verify(storeRepository, never()).existsByIdAndManagerId(7L, 10L);
    }

    private User user(Long id, UserRole role) {
        User user = new User();
        user.setId(id);
        user.setRole(role);
        user.setFirstName("Test");
        user.setLastName("User");
        user.setEmail("test" + id + "@example.com");
        user.setPassword("encoded");
        return user;
    }
}
