package com.foodsave.backend.controller;

import com.foodsave.backend.domain.enums.Permission;
import com.foodsave.backend.dto.SearchResultDTO;
import com.foodsave.backend.service.SearchService;
import com.foodsave.backend.security.SecurityUtils;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/search")
@RequiredArgsConstructor
@Tag(name = "Search", description = "Global search APIs")
public class SearchController {

    private final SearchService searchService;
    private final SecurityUtils securityUtils;

    @GetMapping("/global")
    // @RequirePermission(Permission.USER_READ)
    @Operation(summary = "Global search across all entities")
    public ResponseEntity<SearchResultDTO> globalSearch(@RequestParam String query) {
        return ResponseEntity.ok(searchService.globalSearch(query, securityUtils.getCurrentUser()));
    }

    @GetMapping("/history")
    // @RequirePermission(Permission.USER_READ)
    @Operation(summary = "Get search history")
    public ResponseEntity<List<String>> getSearchHistory() {
        return ResponseEntity.ok(searchService.getSearchHistory(securityUtils.getCurrentUser()));
    }

    @DeleteMapping("/history")
    // @RequirePermission(Permission.USER_DELETE)
    @Operation(summary = "Clear search history")
    public ResponseEntity<Void> clearSearchHistory() {
        searchService.clearSearchHistory(securityUtils.getCurrentUser());
        return ResponseEntity.ok().build();
    }

    @GetMapping("/suggestions")
    // @RequirePermission(Permission.USER_READ)
    @Operation(summary = "Get search suggestions")
    public ResponseEntity<List<String>> getSearchSuggestions(@RequestParam String query) {
        return ResponseEntity.ok(searchService.getSearchSuggestions(query));
    }
} 