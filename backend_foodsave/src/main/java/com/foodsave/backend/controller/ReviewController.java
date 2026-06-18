package com.foodsave.backend.controller;

import com.foodsave.backend.domain.enums.Permission;
import com.foodsave.backend.dto.ReviewDTO;
import com.foodsave.backend.service.ReviewService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/reviews")
public class ReviewController {

    private final ReviewService reviewService;

    public ReviewController(ReviewService reviewService) {
        this.reviewService = reviewService;
    }

    @GetMapping("/product/{productId}")
    // @RequirePermission(Permission.REVIEW_READ)
    public ResponseEntity<List<ReviewDTO>> getProductReviews(@PathVariable Long productId) {
        return ResponseEntity.ok(reviewService.getProductReviews(productId));
    }

    @PostMapping
    // @RequirePermission(Permission.REVIEW_CREATE)
    public ResponseEntity<ReviewDTO> createReview(@RequestBody ReviewDTO reviewDTO) {
        return ResponseEntity.ok(reviewService.createReview(reviewDTO));
    }

    @PutMapping("/{id}")
    // @RequirePermission(Permission.REVIEW_UPDATE)
    public ResponseEntity<ReviewDTO> updateReview(@PathVariable Long id, @RequestBody ReviewDTO reviewDTO) {
        return ResponseEntity.ok(reviewService.updateReview(id, reviewDTO));
    }

    @DeleteMapping("/{id}")
    // @RequirePermission(Permission.REVIEW_DELETE)
    public ResponseEntity<Void> deleteReview(@PathVariable Long id) {
        reviewService.deleteReview(id);
        return ResponseEntity.ok().build();
    }
} 