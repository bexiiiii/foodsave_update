package com.foodsave.backend.repository;


import com.foodsave.backend.entity.Cart;
import com.foodsave.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface CartRepository extends JpaRepository<Cart, Long> {
    Optional<Cart> findByUser(User user);

    @Query("SELECT DISTINCT c FROM Cart c " +
           "LEFT JOIN FETCH c.items ci " +
           "LEFT JOIN FETCH ci.product p " +
           "LEFT JOIN FETCH p.category " +
           "LEFT JOIN FETCH p.store " +
           "WHERE c.user = :user")
    Optional<Cart> findByUserWithItemsAndProductImages(@Param("user") User user);
}
