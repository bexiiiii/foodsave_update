package com.foodsave.backend.repository;

import com.foodsave.backend.entity.Store;
import com.foodsave.backend.entity.User;
import com.foodsave.backend.domain.enums.StoreStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface StoreRepository extends JpaRepository<Store, Long> {
    
    Optional<Store> findByOwner(User owner);
    
    Page<Store> findByOwner(User owner, Pageable pageable);
    
    Page<Store> findByManager(User manager, Pageable pageable);
    
    Optional<Store> findByManager(User manager);
    
    List<Store> findAllByManager(User manager);
    
    List<Store> findByActiveTrue();
    
    List<Store> findByActiveAndStatus(boolean active, StoreStatus status);
    
    List<Store> findByNameContaining(String name);
    
    List<Store> findByAddressContainingIgnoreCase(String address);
    
    List<Store> findByNameContainingIgnoreCaseOrAddressContainingIgnoreCase(String name, String address);
    
    @Query("SELECT s FROM Store s WHERE " +
           "LOWER(s.name) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(s.description) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(s.address) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(s.category) LIKE LOWER(CONCAT('%', :query, '%'))")
    Page<Store> searchStores(@Param("query") String query, Pageable pageable);

    List<Store> findByStatus(StoreStatus status);
    List<Store> findByCategory(String category);
    
    @Query("SELECT s FROM Store s WHERE s.status = ?1 AND s.category = ?2")
    List<Store> findByStatusAndCategory(StoreStatus status, String category);
    
    boolean existsByEmail(String email);
    boolean existsByPhone(String phone);

    Optional<Store> findByName(String name);
    List<Store> findByActive(boolean active);
    boolean existsByName(String name);

    Page<Store> findByNameContainingOrAddressContaining(String name, String address, Pageable pageable);
    Page<Store> findByAddressContaining(String address, Pageable pageable);

    List<Store> findByOwnerId(Long ownerId);
    List<Store> findByStatusAndOwnerId(String status, Long ownerId);
    List<Store> findByStatusAndNameContainingIgnoreCase(String status, String name);
    List<Store> findByStatusAndAddressContainingIgnoreCase(String status, String address);
    List<Store> findByStatusAndNameContainingIgnoreCaseOrAddressContainingIgnoreCase(String status, String name, String address);
    List<Store> findByStatusAndOwnerIdAndNameContainingIgnoreCase(String status, Long ownerId, String name);
    List<Store> findByStatusAndOwnerIdAndAddressContainingIgnoreCase(String status, Long ownerId, String address);
    List<Store> findByStatusAndOwnerIdAndNameContainingIgnoreCaseOrAddressContainingIgnoreCase(String status, Long ownerId, String name, String address);

    @Query("SELECT s FROM Store s WHERE " +
           "s.latitude BETWEEN :minLat AND :maxLat AND " +
           "s.longitude BETWEEN :minLng AND :maxLng")
    Page<Store> findStoresInArea(
            @Param("minLat") double minLat,
            @Param("maxLat") double maxLat,
            @Param("minLng") double minLng,
            @Param("maxLng") double maxLng,
            Pageable pageable);

    boolean existsByIdAndOwner(Long id, User owner);
}
