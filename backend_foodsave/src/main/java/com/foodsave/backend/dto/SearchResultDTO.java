package com.foodsave.backend.dto;

import com.foodsave.backend.entity.Product;
import com.foodsave.backend.entity.Store;
import com.foodsave.backend.entity.User;
import lombok.Data;

import java.util.List;

@Data
public class SearchResultDTO {
    private List<Product> products;
    private List<Store> stores;
    private List<User> users;
} 