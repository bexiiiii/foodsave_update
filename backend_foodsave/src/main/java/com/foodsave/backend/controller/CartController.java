package com.foodsave.backend.controller;

import com.foodsave.backend.dto.CartDTO;
import com.foodsave.backend.dto.CartItemDTO;
import com.foodsave.backend.service.CartService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/cart")
@RequiredArgsConstructor
@Tag(name = "Cart Management", description = "Operations related to shopping cart management")
public class CartController {

    private final CartService cartService;

    @GetMapping("/all")
    @Operation(summary = "Get all carts", description = "Retrieve all shopping carts in the system")
    public ResponseEntity<List<CartDTO>> getAllCarts() {
        List<CartDTO> carts = cartService.getAllCarts();
        return ResponseEntity.ok(carts);
    }

    @GetMapping
    @Operation(summary = "Get user's cart", description = "Retrieve the current user's shopping cart")
    public ResponseEntity<CartDTO> getCart(Authentication authentication) {
        CartDTO cart = cartService.getCartByUser(authentication.getName());
        return ResponseEntity.ok(cart);
    }

    @PostMapping("/items")
    @Operation(summary = "Add item to cart", description = "Add a product to the user's cart")
    public ResponseEntity<CartDTO> addItemToCart(
            @Valid @RequestBody CartItemDTO cartItemDTO,
            Authentication authentication) {
        CartDTO updatedCart = cartService.addItemToCart(authentication.getName(), cartItemDTO);
        return new ResponseEntity<>(updatedCart, HttpStatus.CREATED);
    }

    @PutMapping("/items/{itemId}")
    @Operation(summary = "Update cart item", description = "Update quantity of an item in the cart")
    public ResponseEntity<CartDTO> updateCartItem(
            @Parameter(description = "Cart item ID") @PathVariable Long itemId,
            @Parameter(description = "New quantity") @RequestParam int quantity,
            Authentication authentication) {
        CartDTO updatedCart = cartService.updateCartItem(authentication.getName(), itemId, quantity);
        return ResponseEntity.ok(updatedCart);
    }

    @DeleteMapping("/items/{itemId}")
    @Operation(summary = "Remove item from cart", description = "Remove a specific item from the cart")
    public ResponseEntity<CartDTO> removeItemFromCart(
            @Parameter(description = "Cart item ID") @PathVariable Long itemId,
            Authentication authentication) {
        CartDTO updatedCart = cartService.removeItemFromCart(authentication.getName(), itemId);
        return ResponseEntity.ok(updatedCart);
    }

    @DeleteMapping
    @Operation(summary = "Clear cart", description = "Remove all items from the user's cart")
    public ResponseEntity<CartDTO> clearCart(Authentication authentication) {
        cartService.clearCart(authentication.getName());
        CartDTO emptyCart = cartService.getCartByUser(authentication.getName());
        return ResponseEntity.ok(emptyCart);
    }

    @GetMapping("/count")
    @Operation(summary = "Get cart item count", description = "Get the total number of items in the user's cart")
    public ResponseEntity<Integer> getCartItemCount(Authentication authentication) {
        int count = cartService.getCartItemCount(authentication.getName());
        return ResponseEntity.ok(count);
    }

    @GetMapping("/total")
    @Operation(summary = "Get cart total", description = "Get the total price of all items in the user's cart")
    public ResponseEntity<BigDecimal> getCartTotal(Authentication authentication) {
        BigDecimal total = cartService.getCartTotal(authentication.getName());
        return ResponseEntity.ok(total);
    }
}
