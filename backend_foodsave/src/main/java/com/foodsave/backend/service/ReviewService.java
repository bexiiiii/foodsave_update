package com.foodsave.backend.service;

import com.foodsave.backend.dto.ReviewDTO;
import com.foodsave.backend.entity.Product;
import com.foodsave.backend.entity.Review;
import com.foodsave.backend.entity.User;
import com.foodsave.backend.repository.ProductRepository;
import com.foodsave.backend.repository.ReviewRepository;
import com.foodsave.backend.repository.UserRepository;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class ReviewService {

    private final ReviewRepository reviewRepository;
    private final UserRepository userRepository;
    private final ProductRepository productRepository;

    public ReviewService(ReviewRepository reviewRepository, UserRepository userRepository,
                        ProductRepository productRepository) {
        this.reviewRepository = reviewRepository;
        this.userRepository = userRepository;
        this.productRepository = productRepository;
    }

    public List<ReviewDTO> getProductReviews(Long productId) {
        return reviewRepository.findByProduct_Id(productId, Pageable.unpaged()).getContent().stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    public ReviewDTO createReview(ReviewDTO reviewDTO) {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
        Product product = productRepository.findById(reviewDTO.getProductId())
                .orElseThrow(() -> new RuntimeException("Product not found"));

        Review review = new Review();
        updateReviewFromDTO(review, reviewDTO);
        review.setUser(user);
        review.setProduct(product);
        return convertToDTO(reviewRepository.save(review));
    }

    public ReviewDTO updateReview(Long id, ReviewDTO reviewDTO) {
        Review review = reviewRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Review not found"));
        updateReviewFromDTO(review, reviewDTO);
        return convertToDTO(reviewRepository.save(review));
    }

    public void deleteReview(Long id) {
        reviewRepository.deleteById(id);
    }

    private ReviewDTO convertToDTO(Review review) {
        ReviewDTO dto = new ReviewDTO();
        dto.setId(review.getId());
        dto.setUserId(review.getUser().getId());
        dto.setProductId(review.getProduct().getId());
        dto.setRating(review.getRating());
        dto.setComment(review.getComment());
        dto.setCreatedAt(review.getCreatedAt());
        dto.setModerated(review.isVerified());
        return dto;
    }

    private void updateReviewFromDTO(Review review, ReviewDTO dto) {
        review.setRating(dto.getRating());
        review.setComment(dto.getComment());
    }
} 