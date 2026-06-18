package com.foodsave.backend.dto;

import com.foodsave.backend.entity.Store;
import com.foodsave.backend.domain.enums.StoreStatus;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class StoreDTO {
    private Long id;
    
    @NotBlank(message = "Store name is required")
    @Size(min = 3, max = 100, message = "Store name must be between 3 and 100 characters")
    private String name;
    
    @Size(max = 500, message = "Description cannot exceed 500 characters")
    private String description;
    
    @NotBlank(message = "Address is required")
    @Size(max = 200, message = "Address cannot exceed 200 characters")
    private String address;
    
    @Size(max = 20, message = "Phone number cannot exceed 20 characters")
    private String phone;
    
    @Email(message = "Invalid email format")
    @Size(max = 100, message = "Email cannot exceed 100 characters")
    private String email;
    
    private String logo;
    private String coverImage;
    private String openingHours;
    private String closingHours;
    private Double latitude;
    private Double longitude;
    
    @NotBlank(message = "Category is required")
    @Size(max = 50, message = "Category cannot exceed 50 characters")
    private String category;
    
    private StoreStatus status;
    private boolean active;
    private Long ownerId;
    private String ownerName;
    private Long managerId;
    private String managerName;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private UserDTO user;
    private Integer productCount;

    public static StoreDTO fromEntity(Store store) {
        StoreDTO dto = new StoreDTO();
        dto.setId(store.getId());
        dto.setName(store.getName());
        dto.setDescription(store.getDescription());
        dto.setAddress(store.getAddress());
        dto.setPhone(store.getPhone());
        dto.setEmail(store.getEmail());
        dto.setLogo(store.getLogo());
        dto.setCoverImage(store.getCoverImage());
        dto.setOpeningHours(store.getOpeningHours());
        dto.setClosingHours(store.getClosingHours());
        dto.setLatitude(store.getLatitude());
        dto.setLongitude(store.getLongitude());
        dto.setCategory(store.getCategory());
        dto.setStatus(store.getStatus());
        dto.setActive(store.isActive());
        dto.setOwnerId(store.getOwner().getId());
        dto.setOwnerName(store.getOwner().getEmail());
        
        if (store.getManager() != null) {
            dto.setManagerId(store.getManager().getId());
            dto.setManagerName(store.getManager().getEmail());
        }
        
        dto.setCreatedAt(store.getCreatedAt());
        dto.setUpdatedAt(store.getUpdatedAt());
        if (store.getOwner() != null) {
            dto.setUser(UserDTO.fromEntity(store.getOwner()));
        }
        return dto;
    }
}
