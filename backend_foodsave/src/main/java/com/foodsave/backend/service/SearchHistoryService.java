package com.foodsave.backend.service;

import com.foodsave.backend.entity.SearchHistory;
import com.foodsave.backend.entity.User;
import com.foodsave.backend.repository.SearchHistoryRepository;
import com.foodsave.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class SearchHistoryService {

    private final SearchHistoryRepository searchHistoryRepository;
    private final UserRepository userRepository;

    @Transactional
    public SearchHistory saveSearchHistory(Long userId, String query) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        SearchHistory searchHistory = new SearchHistory();
        searchHistory.setUser(user);
        searchHistory.setQuery(query);
        
        return searchHistoryRepository.save(searchHistory);
    }

    @Transactional(readOnly = true)
    public List<SearchHistory> getUserSearchHistory(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return searchHistoryRepository.findByUserOrderByCreatedAtDesc(user);
    }

    @Transactional
    public void clearUserSearchHistory(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        searchHistoryRepository.deleteByUser(user);
    }
} 