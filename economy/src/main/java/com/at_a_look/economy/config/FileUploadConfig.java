package com.at_a_look.economy.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

import java.util.List;

@Data
@Configuration
@ConfigurationProperties(prefix = "file.upload")
public class FileUploadConfig {
    
    private String dir = "uploads";
    private String maxFileSize = "10MB";
    private String maxRequestSize = "50MB";
    private List<String> allowedTypes = List.of(
        "image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"
    );
    
    private Profile profile = new Profile();
    private Post post = new Post();
    
    @Data
    public static class Profile {
        private String maxSize = "5MB";
    }
    
    @Data
    public static class Post {
        private int maxFiles = 5;
        private String maxSize = "10MB";
    }
    
    /**
     * 파일 크기를 바이트로 변환
     */
    public long parseSize(String size) {
        if (size == null || size.trim().isEmpty()) {
            return 0;
        }
        
        size = size.trim().toUpperCase();
        long multiplier = 1;
        
        if (size.endsWith("KB")) {
            multiplier = 1024;
            size = size.substring(0, size.length() - 2);
        } else if (size.endsWith("MB")) {
            multiplier = 1024 * 1024;
            size = size.substring(0, size.length() - 2);
        } else if (size.endsWith("GB")) {
            multiplier = 1024 * 1024 * 1024;
            size = size.substring(0, size.length() - 2);
        }
        
        try {
            return Long.parseLong(size.trim()) * multiplier;
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException("Invalid file size format: " + size);
        }
    }
    
    /**
     * 프로필 이미지 최대 크기 (바이트)
     */
    public long getProfileMaxSizeBytes() {
        return parseSize(profile.getMaxSize());
    }
    
    /**
     * 게시글 첨부파일 최대 크기 (바이트)
     */
    public long getPostMaxSizeBytes() {
        return parseSize(post.getMaxSize());
    }
    
    /**
     * 일반 파일 최대 크기 (바이트)
     */
    public long getMaxFileSizeBytes() {
        return parseSize(maxFileSize);
    }
} 