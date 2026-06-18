package com.foodsave.backend.repository;

import com.foodsave.backend.entity.Review;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ReviewRepository extends JpaRepository<Review, Long> {

    // Найти отзывы по продукту с пагинацией
    Page<Review> findByProduct_Id(Long productId, Pageable pageable);

    // Найти отзывы по пользователю с пагинацией
    Page<Review> findByUser_Id(Long userId, Pageable pageable);

    // Найти все непрочитанные отзывы
    @Query("SELECT r FROM Review r WHERE r.moderated = false")
    Page<Review> findUnmoderatedReviews(Pageable pageable);

    // Получить средний рейтинг для продукта
    @Query("SELECT AVG(r.rating) FROM Review r WHERE r.product.id = ?1")
    Double getAverageRatingForProduct(Long productId);

    // Найти высоко оценённые отзывы для продукта
    @Query("SELECT r FROM Review r WHERE r.product.id = ?1 AND r.rating >= ?2")
    List<Review> findHighRatedReviews(Long productId, Integer minRating);
}
