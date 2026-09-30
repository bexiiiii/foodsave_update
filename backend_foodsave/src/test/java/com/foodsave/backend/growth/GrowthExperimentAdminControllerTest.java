package com.foodsave.backend.growth;

import com.foodsave.backend.controller.GrowthExperimentAdminController;
import com.foodsave.backend.entity.User;
import com.foodsave.backend.security.SecurityUtils;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Bean;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(GrowthExperimentAdminController.class)
@ContextConfiguration(classes = {GrowthExperimentAdminController.class, GrowthExperimentAdminControllerTest.Security.class})
class GrowthExperimentAdminControllerTest {
    private static final UUID ID = UUID.fromString("00000000-0000-0000-0000-000000000001");
    private static final String ROOT = "/api/admin/growth-experiments";
    @Autowired MockMvc mvc;
    @MockBean GrowthExperimentStore store;
    @MockBean GrowthDispatchService dispatch;
    @MockBean SecurityUtils security;

    @TestConfiguration
    @EnableMethodSecurity
    static class Security {
        @Bean SecurityFilterChain testFilter(HttpSecurity http) throws Exception {
            return http.csrf(c -> c.disable()).authorizeHttpRequests(a -> a.anyRequest().authenticated())
                    .httpBasic(b -> {}).build();
        }
    }

    @Test void anonymousCannotRead() throws Exception {
        mvc.perform(get(ROOT)).andExpect(status().isUnauthorized());
        verifyNoInteractions(store, dispatch);
    }

    @Test @WithMockUser(roles = "CUSTOMER") void ordinaryUserCannotReadOrDispatch() throws Exception {
        mvc.perform(get(ROOT)).andExpect(status().isForbidden());
        mvc.perform(post(ROOT + "/" + ID + "/dispatch").contentType("application/json")
                .content("{\"userId\":1,\"productId\":2}")).andExpect(status().isForbidden());
        verifyNoInteractions(store, dispatch);
    }

    @Test @WithMockUser(roles = "SUPER_ADMIN") void previewDoesNotEnrollOrSend() throws Exception {
        mvc.perform(post(ROOT + "/" + ID + "/preview").contentType("application/json")
                .content("{\"userId\":1}")).andExpect(status().isOk());
        verify(store).preview(ID, 1L);
        verifyNoMoreInteractions(store);
        verifyNoInteractions(dispatch, security);
    }

    @Test @WithMockUser(roles = "SUPER_ADMIN") void actorComesFromAuthenticatedUser() throws Exception {
        User admin = new User(); admin.setId(99L);
        when(security.getCurrentUser()).thenReturn(admin);
        mvc.perform(post(ROOT + "/" + ID + "/assignments").contentType("application/json")
                .content("{\"userId\":1,\"actorUserId\":7}"))
                .andExpect(status().isOk());
        verify(store).assign(ID, 1L, 99L);
    }

    @Test @WithMockUser(roles = "SUPER_ADMIN") void invalidIdsAndMissingEnableAreRejected() throws Exception {
        mvc.perform(post(ROOT + "/" + ID + "/preview").contentType("application/json")
                .content("{\"userId\":0}")).andExpect(status().isBadRequest());
        mvc.perform(put(ROOT + "/" + ID + "/enabled").contentType("application/json")
                .content("{}")).andExpect(status().isBadRequest());
        verifyNoInteractions(store, dispatch);
    }

    @Test @WithMockUser(roles = "SUPER_ADMIN") void storageErrorsDoNotExposeSqlOrData() throws Exception {
        when(store.list(anyInt())).thenThrow(new org.springframework.dao.DataAccessResourceFailureException("private SQL contents"));
        mvc.perform(get(ROOT)).andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.error").value("Growth storage is unavailable or rejected the operation; check migrations and audit constraints"));
    }
}
