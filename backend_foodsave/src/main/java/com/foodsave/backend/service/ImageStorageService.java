package com.foodsave.backend.service;

import net.coobird.thumbnailator.Thumbnails;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.file.FileAlreadyExistsException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardOpenOption;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.Locale;
import java.util.Set;

@Service
public class ImageStorageService {

    private static final Set<String> ALLOWED_IMAGE_TYPES = Set.of(
            "image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"
    );

    @Value("${app.upload.dir:uploads}")
    private String uploadDir;

    @Value("${app.upload.max-file-size:10485760}")
    private long maxFileSize;

    @Value("${app.upload.image.max-dimension:1600}")
    private int maxDimension;

    @Value("${app.upload.image.jpeg-quality:0.82}")
    private double jpegQuality;

    public StoredImage store(MultipartFile file, String targetDirectory) throws IOException {
        validate(file);

        byte[] originalBytes = file.getBytes();
        ImageType imageType = detectImageType(originalBytes);
        if (imageType == null) {
            throw new InvalidImageException("File content is not a supported image");
        }

        byte[] storedBytes = optimize(originalBytes, imageType);
        String fileName = sha256(storedBytes) + imageType.extension();
        Path directory = safeDirectory(targetDirectory);
        Files.createDirectories(directory);

        Path destination = directory.resolve(fileName);
        boolean deduplicated = Files.exists(destination);
        if (!deduplicated) {
            try {
                Files.write(destination, storedBytes, StandardOpenOption.CREATE_NEW);
            } catch (FileAlreadyExistsException ignored) {
                deduplicated = true;
            }
        }

        return new StoredImage(
                fileName,
                storedBytes.length,
                originalBytes.length,
                imageType.contentType(),
                deduplicated
        );
    }

    private void validate(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new InvalidImageException("File is empty");
        }
        if (file.getSize() > maxFileSize) {
            throw new InvalidImageException("File size exceeds maximum allowed size (10MB)");
        }

        String contentType = file.getContentType();
        if (!StringUtils.hasText(contentType)
                || !ALLOWED_IMAGE_TYPES.contains(contentType.toLowerCase(Locale.ROOT))) {
            throw new InvalidImageException("Invalid file type. Only images are allowed.");
        }
    }

    private byte[] optimize(byte[] bytes, ImageType imageType) {
        // Animated GIF and WebP are kept intact because the JDK image codec cannot
        // safely preserve their animation. They still benefit from hash deduplication.
        if (imageType == ImageType.GIF || imageType == ImageType.WEBP) {
            return bytes;
        }

        try (ByteArrayInputStream input = new ByteArrayInputStream(bytes);
             ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            var builder = Thumbnails.of(input)
                    .size(maxDimension, maxDimension)
                    .useExifOrientation(true)
                    .outputFormat(imageType.format());

            if (imageType == ImageType.JPEG) {
                builder.outputQuality(jpegQuality);
            }
            builder.toOutputStream(output);
            return output.toByteArray();
        } catch (IOException | RuntimeException exception) {
            throw new InvalidImageException("Image could not be decoded", exception);
        }
    }

    private Path safeDirectory(String targetDirectory) {
        if (!targetDirectory.matches("[a-zA-Z0-9_-]+")) {
            throw new InvalidImageException("Invalid upload directory");
        }
        Path root = Paths.get(uploadDir).toAbsolutePath().normalize();
        Path directory = root.resolve(targetDirectory).normalize();
        if (!directory.startsWith(root)) {
            throw new InvalidImageException("Invalid upload directory");
        }
        return directory;
    }

    private ImageType detectImageType(byte[] bytes) {
        if (bytes == null || bytes.length < 12) {
            return null;
        }
        if ((bytes[0] & 0xff) == 0xff && (bytes[1] & 0xff) == 0xd8 && (bytes[2] & 0xff) == 0xff) {
            return ImageType.JPEG;
        }
        if ((bytes[0] & 0xff) == 0x89 && bytes[1] == 'P' && bytes[2] == 'N' && bytes[3] == 'G') {
            return ImageType.PNG;
        }
        if (bytes[0] == 'G' && bytes[1] == 'I' && bytes[2] == 'F' && bytes[3] == '8') {
            return ImageType.GIF;
        }
        if (bytes[0] == 'R' && bytes[1] == 'I' && bytes[2] == 'F' && bytes[3] == 'F'
                && bytes[8] == 'W' && bytes[9] == 'E' && bytes[10] == 'B' && bytes[11] == 'P') {
            return ImageType.WEBP;
        }
        return null;
    }

    private String sha256(byte[] bytes) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes));
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is unavailable", exception);
        }
    }

    private enum ImageType {
        JPEG("jpg", ".jpg", "image/jpeg"),
        PNG("png", ".png", "image/png"),
        GIF("gif", ".gif", "image/gif"),
        WEBP("webp", ".webp", "image/webp");

        private final String format;
        private final String extension;
        private final String contentType;

        ImageType(String format, String extension, String contentType) {
            this.format = format;
            this.extension = extension;
            this.contentType = contentType;
        }

        String format() {
            return format;
        }

        String extension() {
            return extension;
        }

        String contentType() {
            return contentType;
        }
    }

    public record StoredImage(
            String fileName,
            long size,
            long originalSize,
            String contentType,
            boolean deduplicated
    ) {
    }

    public static class InvalidImageException extends RuntimeException {
        public InvalidImageException(String message) {
            super(message);
        }

        public InvalidImageException(String message, Throwable cause) {
            super(message, cause);
        }
    }
}
