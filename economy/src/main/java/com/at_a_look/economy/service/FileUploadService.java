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
import java.io.InputStream;
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

    private enum DetectedImageType {
        JPEG("image/jpeg", ".jpg"),
        PNG("image/png", ".png"),
        GIF("image/gif", ".gif"),
        WEBP("image/webp", ".webp"),
        UNKNOWN(null, null);

        final String mime;
        final String extension;
        DetectedImageType(String mime, String extension) { this.mime = mime; this.extension = extension; }
    }

    /**
     * 단일 파일 업로드
     */
    public FileUploadDto.UploadResponse uploadFile(MultipartFile file, String subfolder) throws IOException {
        validateFile(file, fileUploadConfig.getMaxFileSizeBytes());

        String originalFilename = StringUtils.cleanPath(file.getOriginalFilename());
        DetectedImageType detected = detectImageType(file);
        if (detected == DetectedImageType.UNKNOWN || !ALLOWED_IMAGE_TYPES.contains(detected.mime)) {
            throw new IllegalArgumentException("지원하지 않는 파일 형식입니다.");
        }
        String filename = generateFilename(detected.extension);
        
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
                .contentType(detected.mime)
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
            // 업로드 도메인 기준으로만 처리하고, 경로 정규화로 상위 이동 차단
            String relativePath = fileUrl.replace(uploadUrl, "");
            Path baseDir = Paths.get(fileUploadConfig.getDir()).toAbsolutePath().normalize();
            Path filePath = baseDir.resolve(relativePath).normalize();
            if (!filePath.startsWith(baseDir)) {
                log.warn("보안 경고: 업로드 디렉터리 밖의 파일 삭제 시도: {}", filePath);
                return false;
            }
            
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

        DetectedImageType detected = detectImageType(file);
        if (detected == DetectedImageType.UNKNOWN) {
            throw new IllegalArgumentException("지원하지 않는 파일 형식입니다.");
        }
    }


    private String generateFilename(String extension) {
        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"));
        String uuid = UUID.randomUUID().toString().substring(0, 8);
        return String.format("%s_%s%s", timestamp, uuid, extension);
    }



    private Path createUploadPath(String subfolder) throws IOException {
        // 서브폴더 정규화 및 베이스 디렉터리 이탈 방지
        Path baseDir = Paths.get(fileUploadConfig.getDir()).toAbsolutePath().normalize();
        Path uploadPath = baseDir.resolve(subfolder).normalize();
        if (!uploadPath.startsWith(baseDir)) {
            throw new IOException("유효하지 않은 업로드 경로입니다.");
        }
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
            DetectedImageType detected = detectImageType(file);
            if (detected == DetectedImageType.UNKNOWN) {
                throw new IllegalArgumentException("지원하지 않는 파일 형식입니다.");
            }
            String tempFilename = "temp_" + UUID.randomUUID().toString() + detected.extension;
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

    private DetectedImageType detectImageType(MultipartFile file) throws IOException {
        // 별도의 스트림에서 헤더만 읽고 즉시 닫아, 이후 파일 저장용 스트림에 영향이 없도록 함
        try (InputStream in = file.getInputStream()) {
            byte[] header = in.readNBytes(64);
            if (header.length >= 3 && header[0] == (byte)0xFF && header[1] == (byte)0xD8 && header[2] == (byte)0xFF) {
                return DetectedImageType.JPEG;
            }
            if (header.length >= 8 && header[0] == (byte)0x89 && header[1] == (byte)0x50 && header[2] == (byte)0x4E && header[3] == (byte)0x47 && header[4] == (byte)0x0D && header[5] == (byte)0x0A && header[6] == (byte)0x1A && header[7] == (byte)0x0A) {
                return DetectedImageType.PNG;
            }
            if (header.length >= 6 && header[0] == 'G' && header[1] == 'I' && header[2] == 'F' && header[3] == '8' && (header[4] == '7' || header[4] == '9') && header[5] == 'a') {
                return DetectedImageType.GIF;
            }
            if (header.length >= 12 && header[0] == 'R' && header[1] == 'I' && header[2] == 'F' && header[3] == 'F' && header[8] == 'W' && header[9] == 'E' && header[10] == 'B' && header[11] == 'P') {
                return DetectedImageType.WEBP;
            }
            return DetectedImageType.UNKNOWN;
        }
    }
} 