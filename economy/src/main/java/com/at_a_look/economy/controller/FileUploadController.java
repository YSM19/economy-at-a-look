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
import java.util.Map;
import java.util.HashMap;

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

            // 카테고리 화이트리스트 검증
            if (!isValidCategory(category)) {
                return ResponseEntity.badRequest().body(
                    ApiResponse.<FileUploadDto.UploadResponse>builder()
                        .success(false)
                        .message("지원하지 않는 카테고리입니다.")
                        .build()
                );
            }
            
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
            // 클라이언트 제공 MIME은 신뢰하지 말고, 서버단에서 시그니처로 최종 검증
            
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

            // 카테고리 화이트리스트 검증
            if (!isValidCategory(category)) {
                return ResponseEntity.badRequest().body(
                    ApiResponse.<FileUploadDto.MultipleUploadResponse>builder()
                        .success(false)
                        .message("지원하지 않는 카테고리입니다.")
                        .build()
                );
            }
            
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
                
                // 클라이언트 MIME 미신뢰: 서버단 시그니처 검사에 위임
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
            // 파일 삭제는 서버가 관리하는 업로드 URL/경로만 허용되도록 검증
            if (!isSafeFileIdentifier(fileId)) {
                return ResponseEntity.badRequest().body(
                    ApiResponse.<Void>builder()
                        .success(false)
                        .message("유효하지 않은 파일 식별자입니다.")
                        .build()
                );
            }

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
            Map<String, Object> limits = new HashMap<>();
            limits.put("maxFileSize", FileUploadDto.UploadLimits.MAX_FILE_SIZE);
            limits.put("maxFilesPerPost", FileUploadDto.UploadLimits.MAX_FILES_PER_POST);
            limits.put("allowedImageTypes", FileUploadDto.UploadLimits.ALLOWED_IMAGE_TYPES);
            limits.put("allowedDocumentTypes", FileUploadDto.UploadLimits.ALLOWED_DOCUMENT_TYPES);

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
            
            // 클라이언트 MIME 미신뢰: 서버단 시그니처 검사에 위임
            
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

    private boolean isValidCategory(String category) {
        // 업로드 허용 카테고리 화이트리스트
        return switch (category) {
            case "general", "profile", "post", "temp" -> true;
            default -> false;
        };
    }

    private boolean isSafeFileIdentifier(String fileId) {
        // 경로 조작 방지: 상위 디렉터리 이동, 절대 경로, 프로토콜 포함 금지
        if (fileId == null || fileId.isBlank()) return false;
        String lowered = fileId.toLowerCase();
        if (lowered.contains("..") || lowered.startsWith("/") || lowered.startsWith("\\") ||
            lowered.startsWith("http://") || lowered.startsWith("https://") || lowered.contains("://")) {
            return false;
        }
        return true;
    }
} 