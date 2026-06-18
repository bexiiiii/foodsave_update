package com.foodsave.backend.controller;

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
import java.nio.file.StandardCopyOption;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@RestController
@RequestMapping("/api/upload")
@RequiredArgsConstructor
@Tag(name = "File Upload", description = "File upload management APIs")
@CrossOrigin(origins = "*", maxAge = 3600)
@Slf4j
public class FileUploadController {

    @Value("${app.upload.dir:uploads}")
    private String uploadDir;

    @Value("${app.upload.max-file-size:10485760}") // 10MB
    private long maxFileSize;

    @Value("${app.base-url:}")
    private String baseUrl;

    private static final Set<String> ALLOWED_IMAGE_TYPES = Set.of(
            "image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"
    );

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
            // Validate file
            if (file.isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "File is empty"));
            }

            // Check file size
            if (file.getSize() > maxFileSize) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "File size exceeds maximum allowed size (15MB)"));
            }

            // Check file type
            String contentType = file.getContentType();
            if (contentType == null || !ALLOWED_IMAGE_TYPES.contains(contentType.toLowerCase())) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Invalid file type. Only images are allowed."));
            }

            // Create upload directory if it doesn't exist
            Path uploadPath = Paths.get(uploadDir, targetDirectory);
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }

            // Generate unique filename
            String originalFilename = file.getOriginalFilename();
            String fileExtension = getFileExtension(originalFilename);
            String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"));
            String randomString = UUID.randomUUID().toString().substring(0, 8);
            String fileName = timestamp + "_" + randomString + fileExtension;

            // Save file
            Path filePath = uploadPath.resolve(fileName);
            Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);

            // Generate file URL
            String fileUrl = resolveBaseUrl(request) + "/uploads/" + targetDirectory + "/" + fileName;

            log.info("File uploaded successfully: {}", fileName);

            return ResponseEntity.ok(Map.of(
                    "message", "File uploaded successfully",
                    "url", fileUrl,
                    "filename", fileName,
                    "size", file.getSize(),
                    "contentType", contentType
            ));

        } catch (IOException e) {
            log.error("Error uploading file", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to upload file: " + e.getMessage()));
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
            Path filePath = Paths.get(uploadDir, "products", filename);
            
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

    private String getFileExtension(String filename) {
        if (filename == null || filename.isEmpty()) {
            return "";
        }
        int lastDotIndex = filename.lastIndexOf('.');
        return lastDotIndex > 0 ? filename.substring(lastDotIndex) : "";
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
