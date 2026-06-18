package com.foodsave.backend.service;

import com.foodsave.backend.dto.SearchResultDTO;
import com.foodsave.backend.entity.Product;
import com.foodsave.backend.entity.SearchHistory;
import com.foodsave.backend.entity.Store;
import com.foodsave.backend.entity.User;
import com.foodsave.backend.repository.ProductRepository;
import com.foodsave.backend.repository.SearchHistoryRepository;
import com.foodsave.backend.repository.StoreRepository;
import com.foodsave.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class SearchService {

    private final ProductRepository productRepository;
    private final StoreRepository storeRepository;
    private final UserRepository userRepository;
    private final SearchHistoryRepository searchHistoryRepository;

    @Transactional(readOnly = true)
    public SearchResultDTO globalSearch(String query, User user) {
        // Save search history
        SearchHistory searchHistory = new SearchHistory();
        searchHistory.setUser(user);
        searchHistory.setQuery(query);
        searchHistoryRepository.save(searchHistory);

        // Create pageable for pagination
        PageRequest pageRequest = PageRequest.of(0, 10);

        // Search products
        Page<Product> productPage = productRepository.searchProducts(query, pageRequest);
        List<Product> products = productPage.getContent();

        // Search stores
        Page<Store> storePage = storeRepository.searchStores(query, pageRequest);
        List<Store> stores = storePage.getContent();

        // Search users
        Page<User> userPage = userRepository.findByFirstNameContainingOrLastNameContaining(query, query, pageRequest);
        List<User> users = userPage.getContent();

        // Create and return search result
        SearchResultDTO result = new SearchResultDTO();
        result.setProducts(products);
        result.setStores(stores);
        result.setUsers(users);

        return result;
    }

    @Transactional(readOnly = true)
    public List<String> getSearchHistory(User user) {
        return searchHistoryRepository.findByUserOrderByCreatedAtDesc(user)
                .stream()
                .map(SearchHistory::getQuery)
                .collect(Collectors.toList());
    }

    @Transactional
    public void clearSearchHistory(User user) {
        searchHistoryRepository.deleteByUser(user);
    }

    @Transactional(readOnly = true)
    public List<String> getSearchSuggestions(String query) {
        // Get product suggestions
        List<String> productSuggestions = productRepository.findByNameContainingIgnoreCase(query)
                .stream()
                .map(Product::getName)
                .collect(Collectors.toList());

        // Get store suggestions
        List<String> storeSuggestions = storeRepository.findByNameContaining(query)
                .stream()
                .map(Store::getName)
                .collect(Collectors.toList());

        // Get user suggestions
        List<String> userSuggestions = userRepository.findByFirstNameContainingOrLastNameContaining(query, query)
                .stream()
                .map(user -> user.getFirstName() + " " + user.getLastName())
                .collect(Collectors.toList());

        // Combine all suggestions
        List<String> allSuggestions = new java.util.ArrayList<>();
        allSuggestions.addAll(productSuggestions);
        allSuggestions.addAll(storeSuggestions);
        allSuggestions.addAll(userSuggestions);

        return allSuggestions;
    }
} 