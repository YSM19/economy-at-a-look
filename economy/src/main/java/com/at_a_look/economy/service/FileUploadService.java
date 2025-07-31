package com.at_a_look.economy.service;

import com.at_a_look.economy.config.FileUploadConfig;
import com.at_a_look.economy.dto.FileUploadDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.Arrays;

@Slf4j
@Service
@RequiredArgsConstructor
public class FileUploadService {

    private final FileUploadConfig fileUploadConfig;

    @Value("${app.upload.url:http://192.168.0.2:8080/uploads}")
    private String uploadUrl;

    private static final List<String> ALLOWED_IMAGE_TYPES = Arrays.asList(
            "image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"
    );

    /**
     * 단일 파일 업로드
     */
    public FileUploadDto.UploadResponse uploadFile(MultipartFile file, String subfolder) throws IOException {
        validateFile(file, fileUploadConfig.getMaxFileSizeBytes());

        String originalFilename = StringUtils.cleanPath(file.getOriginalFilename());
        String fileExtension = getFileExtension(originalFilename);
        String filename = generateFilename(fileExtension);
        
        Path uploadPath = createUploadPath(subfolder);
        Path filePath = uploadPath.resolve(filename);

        Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);

        String fileUrl = String.format("%s/%s/%s", uploadUrl, subfolder, filename);

        log.info("파일 업로드 완료: {} -> {}", originalFilename, fileUrl);
        log.info("파일 저장 경로: {}", filePath.toAbsolutePath());
        log.info("파일 존재 여부: {}", Files.exists(filePath));

        return FileUploadDto.UploadResponse.builder()
                .fileUrl(fileUrl)
                .originalFilename(originalFilename)
                .contentType(file.getContentType())
                .fileSize(file.getSize())
                .uploadId(UUID.randomUUID().toString())
                .build();
    }

    /**
     * 다중 파일 업로드
     */
    public FileUploadDto.MultipleUploadResponse uploadFiles(List<MultipartFile> files, String subfolder) {
        List<FileUploadDto.UploadResponse> successfulUploads = new ArrayList<>();
        List<String> errors = new ArrayList<>();

        for (MultipartFile file : files) {
            try {
                FileUploadDto.UploadResponse response = uploadFile(file, subfolder);
                successfulUploads.add(response);
            } catch (Exception e) {
                log.error("파일 업로드 실패: {}", file.getOriginalFilename(), e);
                errors.add(file.getOriginalFilename() + ": " + e.getMessage());
            }
        }

        return FileUploadDto.MultipleUploadResponse.builder()
                .files(successfulUploads)
                .successCount(successfulUploads.size())
                .failureCount(errors.size())
                .errors(errors)
                .build();
    }

    /**
     * 프로필 이미지 업로드
     */


    /**
     * 파일 삭제
     */
    public boolean deleteFile(String fileUrl) {
        try {
            String relativePath = fileUrl.replace(uploadUrl, "");
            Path filePath = Paths.get(fileUploadConfig.getDir() + relativePath);
            
            if (Files.exists(filePath)) {
                Files.delete(filePath);
                log.info("파일 삭제 완료: {}", filePath);
                return true;
            } else {
                log.warn("삭제할 파일이 존재하지 않습니다: {}", filePath);
                return false;
            }
        } catch (IOException e) {
            log.error("파일 삭제 실패: {}", fileUrl, e);
            return false;
        }
    }

    private void validateFile(MultipartFile file, long maxFileSizeBytes) throws IOException {
        if (file.isEmpty()) {
            throw new IllegalArgumentException("파일이 비어있습니다.");
        }

        if (file.getSize() > maxFileSizeBytes) {
            throw new IllegalArgumentException("파일 크기가 너무 큽니다. (최대 " + (maxFileSizeBytes / (1024 * 1024)) + "MB)");
        }

        if (!ALLOWED_IMAGE_TYPES.contains(file.getContentType())) {
            throw new IllegalArgumentException("지원하지 않는 파일 형식입니다.");
        }
    }

    private String getFileExtension(String filename) {
        if (filename == null || !filename.contains(".")) {
            return "";
        }
        return filename.substring(filename.lastIndexOf("."));
    }

    private String generateFilename(String extension) {
        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"));
        String uuid = UUID.randomUUID().toString().substring(0, 8);
        return String.format("%s_%s%s", timestamp, uuid, extension);
    }



    private Path createUploadPath(String subfolder) throws IOException {
        Path uploadPath = Paths.get(fileUploadConfig.getDir(), subfolder);
        if (!Files.exists(uploadPath)) {
            Files.createDirectories(uploadPath);
        }
        return uploadPath;
    }



    // 컨트롤러에서 요구하는 메서드 오버로드들
    
    /**
     * 사용자명과 함께 파일 업로드
     */
    public FileUploadDto.UploadResponse uploadFile(MultipartFile file, String category, String username) throws IOException {
        return uploadFile(file, category);
    }

    /**
     * 사용자명과 함께 다중 파일 업로드
     */
    public FileUploadDto.MultipleUploadResponse uploadMultipleFiles(List<MultipartFile> files, String category, String username) {
        return uploadFiles(files, category);
    }



    /**
     * 사용자명과 함께 파일 삭제
     */
    public void deleteFile(String fileId, String username) {
        deleteFile(fileId);
    }

    /**
     * 임시 이미지 URL 생성
     */
    public String generateTempImageUrl(MultipartFile file, String username) {
        try {
            // 임시 파일로 저장
            String tempFilename = "temp_" + UUID.randomUUID().toString() + "_" + file.getOriginalFilename();
            Path tempPath = createUploadPath("temp").resolve(tempFilename);
            
            Files.copy(file.getInputStream(), tempPath, StandardCopyOption.REPLACE_EXISTING);
            
            String tempUrl = uploadUrl + "/temp/" + tempFilename;
            log.info("임시 이미지 URL 생성: {}", tempUrl);
            
            return tempUrl;
        } catch (IOException e) {
            log.error("임시 이미지 URL 생성 실패", e);
            throw new RuntimeException("임시 이미지 URL 생성에 실패했습니다.", e);
        }
    }
} 