package com.foodsave.backend.dto;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.foodsave.backend.domain.enums.StoreStatus;
import com.foodsave.backend.entity.Store;
import com.foodsave.backend.entity.User;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class StorePublicDTOTest {

    @Test
    void publicStoreDoesNotSerializePrivateOrAdministrativeFields() throws Exception {
        User owner = new User();
        owner.setId(1L);
        owner.setFirstName("Private");
        owner.setLastName("Owner");
        owner.setEmail("private@example.com");
        owner.setPhone("+77000000000");
        owner.setPassword("encoded");

        Store store = new Store();
        store.setId(7L);
        store.setName("Public Store");
        store.setAddress("Public address");
        store.setPhone("+77111111111");
        store.setEmail("store-admin@example.com");
        store.setCategory("Кофейня");
        store.setStatus(StoreStatus.ACTIVE);
        store.setActive(true);
        store.setOwner(owner);

        String json = new ObjectMapper().writeValueAsString(StorePublicDTO.fromEntity(store, 3));

        assertTrue(json.contains("Public Store"));
        assertFalse(json.contains("private@example.com"));
        assertFalse(json.contains("store-admin@example.com"));
        assertFalse(json.contains("+77000000000"));
        assertFalse(json.contains("+77111111111"));
        assertFalse(json.contains("ownerId"));
        assertFalse(json.contains("managerId"));
        assertFalse(json.contains("\"user\""));
    }
}
