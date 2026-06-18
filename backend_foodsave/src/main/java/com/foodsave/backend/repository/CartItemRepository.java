package com.foodsave.backend.repository;


import com.foodsave.backend.entity.Cart;
import com.foodsave.backend.entity.CartItem;
import com.foodsave.backend.entity.Product;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@Repository
public interface CartItemRepository extends JpaRepository<CartItem, Long> {
    
    List<CartItem> findByCart(Cart cart);
    
    Optional<CartItem> findByCartAndProduct(Cart cart, Product product);
    
    void deleteByCart(Cart cart);
    
    @Query("SELECT SUM(ci.quantity * ci.product.price) FROM CartItem ci WHERE ci.cart = :cart")
    BigDecimal calculateCartTotal(@Param("cart") Cart cart);
}
