package com.at_a_look.economy.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

public class FileUploadDto {

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UploadResponse {
        private String fileUrl;
        private String originalFilename;
        private String contentType;
        private Long fileSize;
        private String uploadId; // 임시 업로드 ID (게시글 작성 시 연결용)
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MultipleUploadResponse {
        private List<UploadResponse> files;
        private int successCount;
        private int failureCount;
        private List<String> errors;
    }



    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UploadErrorResponse {
        private String filename;
        private String error;
        private String errorCode;
    }

    // 파일 업로드 제한 설정
    public static class UploadLimits {
        public static final long MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
        public static final int MAX_FILES_PER_POST = 5;
        public static final int MAX_FILES_PER_REQUEST = 10;
        
        public static final List<String> ALLOWED_IMAGE_TYPES = List.of(
            "image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"
        );
        
        public static final List<String> ALLOWED_DOCUMENT_TYPES = List.of(
            "application/pdf", "application/msword", 
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "text/plain"
        );
    }
} 