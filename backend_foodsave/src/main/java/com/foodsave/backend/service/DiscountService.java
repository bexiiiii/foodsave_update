package com.foodsave.backend.service;

import com.foodsave.backend.dto.DiscountDTO;
import com.foodsave.backend.entity.Discount;
import com.foodsave.backend.entity.Product;
import com.foodsave.backend.entity.Store;
import com.foodsave.backend.repository.DiscountRepository;
import com.foodsave.backend.repository.ProductRepository;
import com.foodsave.backend.repository.StoreRepository;
import com.foodsave.backend.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class DiscountService {

    private final DiscountRepository discountRepository;
    private final ProductRepository productRepository;
    private final StoreRepository storeRepository;

    public List<DiscountDTO> getAllDiscounts() {
        return discountRepository.findAll().stream()
                .map(DiscountDTO::fromEntity)
                .collect(Collectors.toList());
    }

    public DiscountDTO getDiscountById(Long id) {
        return discountRepository.findById(id)
                .map(DiscountDTO::fromEntity)
                .orElseThrow(() -> new ResourceNotFoundException("Discount not found with id: " + id));
    }

    public DiscountDTO createDiscount(DiscountDTO discountDTO) {
        Store store = storeRepository.findById(discountDTO.getStoreId())
                .orElseThrow(() -> new ResourceNotFoundException("Store not found with id: " + discountDTO.getStoreId()));

        Discount discount = new Discount();
        discount.setCode(discountDTO.getCode());
        discount.setDescription(discountDTO.getDescription());
        discount.setDiscountPercentage(discountDTO.getDiscountPercentage());
        discount.setMinOrderAmount(discountDTO.getMinOrderAmount());
        discount.setMaxDiscountAmount(discountDTO.getMaxDiscountAmount());
        discount.setStartDate(discountDTO.getStartDate());
        discount.setEndDate(discountDTO.getEndDate());
        discount.setStore(store);
        discount.setActive(true);

        return DiscountDTO.fromEntity(discountRepository.save(discount));
    }

    public DiscountDTO updateDiscount(Long id, DiscountDTO discountDTO) {
        Discount discount = discountRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Discount not found with id: " + id));

        discount.setCode(discountDTO.getCode());
        discount.setDescription(discountDTO.getDescription());
        discount.setDiscountPercentage(discountDTO.getDiscountPercentage());
        discount.setMinOrderAmount(discountDTO.getMinOrderAmount());
        discount.setMaxDiscountAmount(discountDTO.getMaxDiscountAmount());
        discount.setStartDate(discountDTO.getStartDate());
        discount.setEndDate(discountDTO.getEndDate());
        discount.setActive(discountDTO.isActive());

        return DiscountDTO.fromEntity(discountRepository.save(discount));
    }

    public void deleteDiscount(Long id) {
        if (!discountRepository.existsById(id)) {
            throw new ResourceNotFoundException("Discount not found with id: " + id);
        }
        discountRepository.deleteById(id);
    }

    public DiscountDTO applyDiscount(String code) {
        Discount discount = discountRepository.findByCode(code)
                .orElseThrow(() -> new ResourceNotFoundException("Discount code not found: " + code));

        if (!discount.isActive()) {
            throw new IllegalStateException("Discount code is not active");
        }

        LocalDateTime now = LocalDateTime.now();
        if (now.isBefore(discount.getStartDate()) || now.isAfter(discount.getEndDate())) {
            throw new IllegalStateException("Discount code is not valid at this time");
        }

        return DiscountDTO.fromEntity(discount);
    }

    public double applyDiscount(Product product, double discountPercentage) {
        if (discountPercentage < 0 || discountPercentage > 100) {
            throw new IllegalArgumentException("Discount percentage must be between 0 and 100");
        }
        double basePrice = product.getPrice() != null ? product.getPrice().doubleValue() : 0.0;
        return basePrice * (1 - discountPercentage / 100.0);
    }
} 
