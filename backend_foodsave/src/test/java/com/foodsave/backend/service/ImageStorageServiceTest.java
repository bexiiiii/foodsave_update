package com.foodsave.backend.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;

import javax.imageio.ImageIO;
import java.awt.Color;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ImageStorageServiceTest {

    @TempDir
    Path tempDir;

    @Test
    void compressesLargeImageAndReusesIdenticalUpload() throws Exception {
        ImageStorageService service = service();
        byte[] source = jpeg(2400, 1800);
        MockMultipartFile file = new MockMultipartFile("file", "photo.jpg", "image/jpeg", source);

        ImageStorageService.StoredImage first = service.store(file, "products");
        ImageStorageService.StoredImage second = service.store(file, "products");

        assertThat(first.fileName()).matches("[a-f0-9]{64}\\.jpg");
        assertThat(first.deduplicated()).isFalse();
        assertThat(second.deduplicated()).isTrue();
        assertThat(second.fileName()).isEqualTo(first.fileName());
        assertThat(Files.list(tempDir.resolve("products"))).hasSize(1);

        BufferedImage stored = ImageIO.read(tempDir.resolve("products").resolve(first.fileName()).toFile());
        assertThat(stored.getWidth()).isLessThanOrEqualTo(1600);
        assertThat(stored.getHeight()).isLessThanOrEqualTo(1600);
    }

    @Test
    void rejectsNonImagePayloadWithImageMimeType() {
        ImageStorageService service = service();
        MockMultipartFile file = new MockMultipartFile(
                "file", "fake.jpg", "image/jpeg", "not an image".getBytes()
        );

        assertThatThrownBy(() -> service.store(file, "products"))
                .isInstanceOf(ImageStorageService.InvalidImageException.class)
                .hasMessageContaining("supported image");
    }

    private ImageStorageService service() {
        ImageStorageService service = new ImageStorageService();
        ReflectionTestUtils.setField(service, "uploadDir", tempDir.toString());
        ReflectionTestUtils.setField(service, "maxFileSize", 10 * 1024 * 1024L);
        ReflectionTestUtils.setField(service, "maxDimension", 1600);
        ReflectionTestUtils.setField(service, "jpegQuality", 0.82d);
        return service;
    }

    private byte[] jpeg(int width, int height) throws Exception {
        BufferedImage image = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
        for (int y = 0; y < height; y++) {
            int green = (int) (255.0 * y / height);
            for (int x = 0; x < width; x++) {
                int red = (int) (255.0 * x / width);
                image.setRGB(x, y, new Color(red, green, 80).getRGB());
            }
        }
        try (ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            ImageIO.write(image, "jpg", output);
            return output.toByteArray();
        }
    }
}
