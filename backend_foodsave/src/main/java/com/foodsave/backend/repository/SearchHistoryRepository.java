package com.foodsave.backend.repository;

import com.foodsave.backend.entity.SearchHistory;
import com.foodsave.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SearchHistoryRepository extends JpaRepository<SearchHistory, Long> {
    List<SearchHistory> findByUserOrderByCreatedAtDesc(User user);
    void deleteByUser(User user);
} 