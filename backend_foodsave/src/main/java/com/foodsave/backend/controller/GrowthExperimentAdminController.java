package com.foodsave.backend.controller;

import com.foodsave.backend.growth.GrowthCohort;
import com.foodsave.backend.growth.GrowthDispatchService;
import com.foodsave.backend.growth.GrowthExperimentStore;
import com.foodsave.backend.security.SecurityUtils;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** Deliberately manual. A preview never creates participants, verifies stock, or dispatches. */
@RestController
@RequestMapping("/api/admin/growth-experiments")
@PreAuthorize("hasRole('SUPER_ADMIN')")
@RequiredArgsConstructor
public class GrowthExperimentAdminController {
    private final GrowthExperimentStore experiments;
    private final GrowthDispatchService dispatch;
    private final SecurityUtils security;

    @GetMapping
    public List<GrowthExperimentStore.Experiment> list(@RequestParam(defaultValue = "50") int limit) {
        return experiments.list(limit);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public GrowthExperimentStore.Experiment create(@Valid @RequestBody CreateRequest request) {
        return experiments.create(request.name(), request.seed(), request.holdoutBps(), actor());
    }

    @GetMapping("/{id}")
    public GrowthExperimentStore.Experiment find(@PathVariable UUID id) {
        return experiments.find(id);
    }

    @PostMapping("/{id}/preview")
    public GrowthExperimentStore.Preview preview(@PathVariable UUID id, @Valid @RequestBody UserRequest request) {
        return experiments.preview(id, request.userId());
    }

    @GetMapping("/{id}/candidates")
    public GrowthExperimentStore.CandidatePreview candidates(@PathVariable UUID id,
            @RequestParam GrowthCohort cohort, @RequestParam(defaultValue = "100") int limit) {
        return experiments.candidatePreview(id, cohort, limit);
    }

    @PostMapping("/{id}/assignments")
    public GrowthExperimentStore.Assignment assign(@PathVariable UUID id, @Valid @RequestBody UserRequest request) {
        return experiments.assign(id, request.userId(), actor());
    }

    @PutMapping("/{id}/enabled")
    public GrowthExperimentStore.Experiment enabled(@PathVariable UUID id, @Valid @RequestBody EnableRequest request) {
        return experiments.setEnabled(id, request.enabled(), actor());
    }

    @GetMapping("/{id}/measurements")
    public List<GrowthExperimentStore.Measure> measurements(@PathVariable UUID id) {
        return experiments.measure(id);
    }

    @PostMapping("/{id}/dispatch-preview")
    public GrowthDispatchService.Preview dispatchPreview(@PathVariable UUID id,
            @Valid @RequestBody DispatchRequest request) {
        return dispatch.preview(id, request.userId(), request.productId());
    }

    @PostMapping("/{id}/dispatch")
    public GrowthDispatchService.DispatchResult dispatch(@PathVariable UUID id,
            @Valid @RequestBody DispatchRequest request) {
        return dispatch.dispatch(id, request.userId(), request.productId(), actor());
    }

    @PostMapping("/pickup-windows")
    @ResponseStatus(HttpStatus.CREATED)
    public GrowthDispatchService.PickupWindow verifyPickup(@Valid @RequestBody PickupRequest request) {
        return dispatch.verifyPickupWindow(request.productId(), request.startsAt(), request.endsAt(), actor());
    }

    private long actor() { return security.getCurrentUser().getId(); }

    // Never expose SQL, ledger content, credentials or raw provider responses on this surface.
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> invalidRequest(IllegalArgumentException ignored) {
        return ResponseEntity.badRequest().body(Map.of("error", "Invalid experiment request or missing resource"));
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<Map<String, String>> conflict(IllegalStateException ignored) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", "Experiment operation is not permitted in its current state"));
    }

    @ExceptionHandler(DataAccessException.class)
    public ResponseEntity<Map<String, String>> unavailable(DataAccessException ignored) {
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                .body(Map.of("error", "Growth storage is unavailable or rejected the operation; check migrations and audit constraints"));
    }

    public record CreateRequest(@NotBlank @Size(max = 120) String name,
                                @NotBlank @Size(max = 255) String seed,
                                @NotNull @Min(1) @Max(9999) Integer holdoutBps) { }
    public record UserRequest(@Positive long userId) { }
    public record DispatchRequest(@Positive long userId, @Positive long productId) { }
    public record EnableRequest(@NotNull Boolean enabled) { }
    public record PickupRequest(@Positive long productId, @NotNull Instant startsAt, @NotNull Instant endsAt) { }
}
