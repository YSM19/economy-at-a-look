package com.at_a_look.economy.controller;

import com.at_a_look.economy.dto.FileUploadDto;
import com.at_a_look.economy.dto.response.ApiResponse;
import com.at_a_look.economy.service.FileUploadService;
import com.at_a_look.economy.util.JwtTokenUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import jakarta.servlet.http.HttpServletRequest;
import java.util.List;

@RestController
@RequestMapping("/api/files")
@RequiredArgsConstructor
@Slf4j
public class FileUploadController {

    private final FileUploadService fileUploadService;
    private final JwtTokenUtil jwtTokenUtil;

    /**
     * 단일 파일 업로드
     */
    @PostMapping("/upload")
    public ResponseEntity<ApiResponse<FileUploadDto.UploadResponse>> uploadFile(
            @RequestParam("file") MultipartFile file,
            @RequestParam(defaultValue = "general") String category,
            HttpServletRequest request) {
        try {
            String username = getUsernameFromToken(request);
            
            // 파일 검증
            if (file.isEmpty()) {
                return ResponseEntity.badRequest().body(
                    ApiResponse.<FileUploadDto.UploadResponse>builder()
                        .success(false)
                        .message("업로드할 파일이 선택되지 않았습니다.")
                        .build()
                );
            }
            
            // 파일 크기 검증
            if (file.getSize() > FileUploadDto.UploadLimits.MAX_FILE_SIZE) {
                return ResponseEntity.badRequest().body(
                    ApiResponse.<FileUploadDto.UploadResponse>builder()
                        .success(false)
                        .message("파일 크기가 너무 큽니다. 최대 " + 
                               (FileUploadDto.UploadLimits.MAX_FILE_SIZE / 1024 / 1024) + "MB까지 업로드 가능합니다.")
                        .build()
                );
            }
            
            // 파일 형식 검증
            String contentType = file.getContentType();
            if (contentType == null || !FileUploadDto.UploadLimits.ALLOWED_IMAGE_TYPES.contains(contentType)) {
                return ResponseEntity.badRequest().body(
                    ApiResponse.<FileUploadDto.UploadResponse>builder()
                        .success(false)
                        .message("지원하지 않는 파일 형식입니다. " + 
                               FileUploadDto.UploadLimits.ALLOWED_IMAGE_TYPES + " 형식만 업로드 가능합니다.")
                        .build()
                );
            }
            
            FileUploadDto.UploadResponse response = fileUploadService.uploadFile(file, category, username);
            
            return ResponseEntity.ok(
                ApiResponse.<FileUploadDto.UploadResponse>builder()
                    .success(true)
                    .message("파일이 성공적으로 업로드되었습니다.")
                    .data(response)
                    .build()
            );
        } catch (Exception e) {
            log.error("파일 업로드 실패", e);
            return ResponseEntity.badRequest().body(
                ApiResponse.<FileUploadDto.UploadResponse>builder()
                    .success(false)
                    .message("파일 업로드에 실패했습니다: " + e.getMessage())
                    .build()
            );
        }
    }

    /**
     * 다중 파일 업로드
     */
    @PostMapping("/upload/multiple")
    public ResponseEntity<ApiResponse<FileUploadDto.MultipleUploadResponse>> uploadMultipleFiles(
            @RequestParam("files") List<MultipartFile> files,
            @RequestParam(defaultValue = "general") String category,
            HttpServletRequest request) {
        try {
            String username = getUsernameFromToken(request);
            
            // 파일 개수 검증
            if (files.isEmpty()) {
                return ResponseEntity.badRequest().body(
                    ApiResponse.<FileUploadDto.MultipleUploadResponse>builder()
                        .success(false)
                        .message("업로드할 파일이 선택되지 않았습니다.")
                        .build()
                );
            }
            
            if (files.size() > FileUploadDto.UploadLimits.MAX_FILES_PER_REQUEST) {
                return ResponseEntity.badRequest().body(
                    ApiResponse.<FileUploadDto.MultipleUploadResponse>builder()
                        .success(false)
                        .message("한 번에 최대 " + FileUploadDto.UploadLimits.MAX_FILES_PER_REQUEST + 
                               "개 파일까지 업로드 가능합니다.")
                        .build()
                );
            }
            
            // 각 파일 검증
            for (MultipartFile file : files) {
                if (file.getSize() > FileUploadDto.UploadLimits.MAX_FILE_SIZE) {
                    return ResponseEntity.badRequest().body(
                        ApiResponse.<FileUploadDto.MultipleUploadResponse>builder()
                            .success(false)
                            .message("파일 '" + file.getOriginalFilename() + "'의 크기가 너무 큽니다.")
                            .build()
                    );
                }
                
                String contentType = file.getContentType();
                if (contentType == null || !FileUploadDto.UploadLimits.ALLOWED_IMAGE_TYPES.contains(contentType)) {
                    return ResponseEntity.badRequest().body(
                        ApiResponse.<FileUploadDto.MultipleUploadResponse>builder()
                            .success(false)
                            .message("파일 '" + file.getOriginalFilename() + "'은 지원하지 않는 형식입니다.")
                            .build()
                    );
                }
            }
            
            FileUploadDto.MultipleUploadResponse response = fileUploadService.uploadMultipleFiles(files, category, username);
            
            return ResponseEntity.ok(
                ApiResponse.<FileUploadDto.MultipleUploadResponse>builder()
                    .success(true)
                    .message("파일들이 성공적으로 업로드되었습니다.")
                    .data(response)
                    .build()
            );
        } catch (Exception e) {
            log.error("다중 파일 업로드 실패", e);
            return ResponseEntity.badRequest().body(
                ApiResponse.<FileUploadDto.MultipleUploadResponse>builder()
                    .success(false)
                    .message("파일 업로드에 실패했습니다: " + e.getMessage())
                    .build()
            );
        }
    }

    /**
     * 파일 삭제
     */
    @DeleteMapping("/{fileId}")
    public ResponseEntity<ApiResponse<Void>> deleteFile(
            @PathVariable String fileId,
            HttpServletRequest request) {
        try {
            String username = getUsernameFromToken(request);
            
            fileUploadService.deleteFile(fileId, username);
            
            return ResponseEntity.ok(
                ApiResponse.<Void>builder()
                    .success(true)
                    .message("파일이 성공적으로 삭제되었습니다.")
                    .build()
            );
        } catch (Exception e) {
            log.error("파일 삭제 실패", e);
            return ResponseEntity.badRequest().body(
                ApiResponse.<Void>builder()
                    .success(false)
                    .message("파일 삭제에 실패했습니다: " + e.getMessage())
                    .build()
            );
        }
    }

    /**
     * 업로드 제한 정보 조회
     */
    @GetMapping("/limits")
    public ResponseEntity<ApiResponse<Object>> getUploadLimits() {
        try {
            Object limits = new Object() {
                public final long maxFileSize = FileUploadDto.UploadLimits.MAX_FILE_SIZE;
                public final int maxFilesPerPost = FileUploadDto.UploadLimits.MAX_FILES_PER_POST;
                public final List<String> allowedImageTypes = FileUploadDto.UploadLimits.ALLOWED_IMAGE_TYPES;
                public final List<String> allowedDocumentTypes = FileUploadDto.UploadLimits.ALLOWED_DOCUMENT_TYPES;
            };
            
            return ResponseEntity.ok(ApiResponse.success(limits));
        } catch (Exception e) {
            log.error("업로드 제한 정보 조회 실패", e);
            return ResponseEntity.badRequest()
                .body(ApiResponse.error("업로드 제한 정보 조회에 실패했습니다."));
        }
    }

    /**
     * 임시 이미지 URL 생성 (미리보기용)
     */
    @PostMapping("/temp-url")
    public ResponseEntity<ApiResponse<String>> generateTempImageUrl(
            @RequestParam("file") MultipartFile file,
            HttpServletRequest request) {
        try {
            String username = getUsernameFromToken(request);
            
            // 파일 유효성 검사
            if (file.isEmpty()) {
                return ResponseEntity.badRequest()
                    .body(ApiResponse.error("업로드할 파일을 선택해주세요."));
            }
            
            String contentType = file.getContentType();
            if (contentType == null || !FileUploadDto.UploadLimits.ALLOWED_IMAGE_TYPES.contains(contentType)) {
                return ResponseEntity.badRequest()
                    .body(ApiResponse.error("지원되지 않는 파일 형식입니다."));
            }
            
            String tempUrl = fileUploadService.generateTempImageUrl(file, username);
            
            return ResponseEntity.ok(ApiResponse.success(tempUrl));
        } catch (Exception e) {
            log.error("임시 이미지 URL 생성 실패", e);
            return ResponseEntity.badRequest()
                .body(ApiResponse.error("임시 이미지 URL 생성에 실패했습니다."));
        }
    }

    private String getUsernameFromToken(HttpServletRequest request) {
        String token = jwtTokenUtil.getTokenFromRequest(request);
        return jwtTokenUtil.getUsernameFromToken(token);
    }
} 