package com.foodsave.backend.controller;

import com.foodsave.backend.service.ImageStorageService;
import com.foodsave.backend.service.ImageStorageService.InvalidImageException;
import com.foodsave.backend.service.ImageStorageService.StoredImage;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.*;

@RestController
@RequestMapping("/api/upload")
@RequiredArgsConstructor
@Tag(name = "File Upload", description = "File upload management APIs")
@Slf4j
public class FileUploadController {

    @Value("${app.upload.dir:uploads}")
    private String uploadDir;

    @Value("${app.base-url:}")
    private String baseUrl;

    private final ImageStorageService imageStorageService;

    @PostMapping("/image")
    @PreAuthorize("hasRole('STORE_OWNER') or hasRole('STORE_MANAGER') or hasRole('SUPER_ADMIN')")
    @Operation(summary = "Upload product image")
    public ResponseEntity<?> uploadImage(@RequestParam("file") MultipartFile file,
                                         HttpServletRequest request) {
        return handleFileUpload(file, "products", request);
    }

    @PostMapping("/store-logo")
    @PreAuthorize("hasRole('STORE_OWNER') or hasRole('STORE_MANAGER') or hasRole('SUPER_ADMIN')")
    @Operation(summary = "Upload store logo")
    public ResponseEntity<?> uploadStoreLogo(@RequestParam("file") MultipartFile file,
                                             HttpServletRequest request) {
        return handleFileUpload(file, "stores", request);
    }

    private ResponseEntity<?> handleFileUpload(MultipartFile file, String targetDirectory, HttpServletRequest request) {
        try {
            StoredImage storedImage = imageStorageService.store(file, targetDirectory);

            String fileUrl = resolveBaseUrl(request) + "/uploads/" + targetDirectory + "/" + storedImage.fileName();

            log.info("Image stored: filename={}, originalSize={}, storedSize={}, deduplicated={}",
                    storedImage.fileName(), storedImage.originalSize(), storedImage.size(), storedImage.deduplicated());

            return ResponseEntity.ok(Map.of(
                    "message", storedImage.deduplicated() ? "Existing image reused" : "File uploaded successfully",
                    "url", fileUrl,
                    "filename", storedImage.fileName(),
                    "size", storedImage.size(),
                    "originalSize", storedImage.originalSize(),
                    "contentType", storedImage.contentType(),
                    "deduplicated", storedImage.deduplicated()
            ));
        } catch (InvalidImageException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (IOException e) {
            log.error("Error uploading file", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to store image"));
        }
    }

    @PostMapping("/images")
    @PreAuthorize("hasRole('STORE_OWNER') or hasRole('STORE_MANAGER') or hasRole('SUPER_ADMIN')")
    @Operation(summary = "Upload multiple product images")
    public ResponseEntity<?> uploadImages(@RequestParam("files") MultipartFile[] files,
                                          HttpServletRequest request) {
        List<Map<String, Object>> uploadedFiles = new ArrayList<>();
        List<String> errors = new ArrayList<>();

        for (MultipartFile file : files) {
            try {
                ResponseEntity<?> result = uploadImage(file, request);
                if (result.getStatusCode() == HttpStatus.OK) {
                    @SuppressWarnings("unchecked")
                    Map<String, Object> responseBody = (Map<String, Object>) result.getBody();
                    uploadedFiles.add(responseBody);
                } else {
                    @SuppressWarnings("unchecked")
                    Map<String, Object> errorBody = (Map<String, Object>) result.getBody();
                    errors.add(file.getOriginalFilename() + ": " + errorBody.get("error"));
                }
            } catch (Exception e) {
                errors.add(file.getOriginalFilename() + ": " + e.getMessage());
            }
        }

        Map<String, Object> response = new HashMap<>();
        response.put("uploadedFiles", uploadedFiles);
        response.put("successCount", uploadedFiles.size());
        response.put("totalCount", files.length);

        if (!errors.isEmpty()) {
            response.put("errors", errors);
            response.put("errorCount", errors.size());
        }

        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/image")
    @PreAuthorize("hasRole('STORE_OWNER') or hasRole('STORE_MANAGER') or hasRole('SUPER_ADMIN')")
    @Operation(summary = "Delete uploaded image")
    public ResponseEntity<?> deleteImage(@RequestParam("filename") String filename) {
        try {
            if (filename.matches("[a-f0-9]{64}\\.(jpg|png|gif|webp)")) {
                return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
                        "error", "Content-addressed images are shared and cannot be deleted directly"
                ));
            }
            Path productDirectory = Paths.get(uploadDir, "products").toAbsolutePath().normalize();
            Path filePath = productDirectory.resolve(filename).normalize();
            if (!filePath.startsWith(productDirectory) || filename.contains("/") || filename.contains("\\")) {
                return ResponseEntity.badRequest().body(Map.of("error", "Invalid filename"));
            }
            
            if (Files.exists(filePath)) {
                Files.delete(filePath);
                log.info("File deleted successfully: {}", filename);
                return ResponseEntity.ok(Map.of("message", "File deleted successfully"));
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (IOException e) {
            log.error("Error deleting file", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to delete file: " + e.getMessage()));
        }
    }

    private String resolveBaseUrl(HttpServletRequest request) {
        if (StringUtils.hasText(baseUrl)) {
            return baseUrl.endsWith("/") ? baseUrl.substring(0, baseUrl.length() - 1) : baseUrl;
        }

        String contextPath = request.getContextPath();
        String resolved = ServletUriComponentsBuilder.fromRequestUri(request)
                .replacePath(contextPath != null ? contextPath : "")
                .replaceQuery(null)
                .build()
                .toUriString();

        return resolved.endsWith("/") ? resolved.substring(0, resolved.length() - 1) : resolved;
    }
}
