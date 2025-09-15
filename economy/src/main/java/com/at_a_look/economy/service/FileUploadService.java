package com.at_a_look.economy.service;

import com.at_a_look.economy.config.FileUploadConfig;
import com.at_a_look.economy.dto.FileUploadDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

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

    @Value("${app.upload.url:http://localhost:8080/uploads}")
    private String configuredUploadUrl;

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

        String baseUrl = resolveBaseUploadUrl();
        String fileUrl = String.format("%s/%s/%s", baseUrl, subfolder, filename);

        log.info("파일 업로드 완료: {}", originalFilename);
        // 내부 경로/서버 IP 노출 방지
        log.debug("파일 저장 완료");

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
            String relativePath = fileUrl;
            String baseUrl = resolveBaseUploadUrl();
            if (relativePath.startsWith(baseUrl)) {
                relativePath = relativePath.substring(baseUrl.length());
            } else if (StringUtils.hasText(configuredUploadUrl) && relativePath.startsWith(configuredUploadUrl)) {
                relativePath = relativePath.substring(configuredUploadUrl.length());
            }
            Path baseDir = Paths.get(fileUploadConfig.getDir()).toAbsolutePath().normalize();
            Path filePath = baseDir.resolve(relativePath).normalize();
            if (!filePath.startsWith(baseDir)) {
                log.warn("보안 경고: 업로드 디렉터리 밖의 파일 삭제 시도: {}", filePath);
                return false;
            }
            
            if (Files.exists(filePath)) {
                Files.delete(filePath);
                log.info("파일 삭제 완료");
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
            
            String tempUrl = resolveBaseUploadUrl() + "/temp/" + tempFilename;
            log.info("임시 이미지 URL 생성: {}", tempUrl);
            
            return tempUrl;
        } catch (IOException e) {
            log.error("임시 이미지 URL 생성 실패", e);
            throw new RuntimeException("임시 이미지 URL 생성에 실패했습니다.", e);
        }
    }

    /**
     * 리버스 프록시(예: Nginx, ELB) 환경에서 요청 헤더를 바탕으로 업로드 베이스 URL을 동적으로 결정합니다.
     * 우선순위: Forwarded/X-Forwarded-* 헤더 → HttpServletRequest → 프로퍼티(app.upload.url)
     */
    private String resolveBaseUploadUrl() {
        try {
            ServletRequestAttributes attrs = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            if (attrs != null) {
                jakarta.servlet.http.HttpServletRequest request = attrs.getRequest();
                // RFC 7239 Forwarded 헤더 파싱 시도
                String forwarded = request.getHeader("Forwarded");
                if (StringUtils.hasText(forwarded)) {
                    String proto = extractForwardedParam(forwarded, "proto");
                    String host = extractForwardedParam(forwarded, "host");
                    if (StringUtils.hasText(proto) && StringUtils.hasText(host) && isSafeHost(host)) {
                        return buildBaseUrl(proto, host, null);
                    }
                }
                // X-Forwarded-* 헤더 사용
                String proto = headerOrNull(request, "X-Forwarded-Proto");
                String host = headerOrNull(request, "X-Forwarded-Host");
                String port = headerOrNull(request, "X-Forwarded-Port");
                if (StringUtils.hasText(proto) && StringUtils.hasText(host) && isSafeHost(host)) {
                    return buildBaseUrl(proto, host, port);
                }
                // 프록시가 없다면 직접 호스트 사용
                String scheme = request.getScheme();
                String serverName = request.getServerName();
                int serverPort = request.getServerPort();
                if (StringUtils.hasText(scheme) && isSafeHost(serverName)) {
                    String hostPort = serverName + normalizePortForScheme(serverPort, scheme);
                    return buildBaseUrl(scheme, hostPort, null);
                }
            }
        } catch (Exception e) {
            log.debug("업로드 베이스 URL 동적 해석 실패, 프로퍼티 사용: {}", e.getMessage());
        }
        // 최종 폴백: 설정값
        return StringUtils.hasText(configuredUploadUrl) ? configuredUploadUrl : "http://localhost:8080/uploads";
    }

    private String headerOrNull(jakarta.servlet.http.HttpServletRequest req, String name) {
        String v = req.getHeader(name);
        return (v != null && !v.isBlank()) ? v.trim() : null;
    }

    private String extractForwardedParam(String forwarded, String key) {
        // 예: Forwarded: proto=https;host=example.com;for=...  (쉼표로 분리된 첫 요소만 처리)
        try {
            String first = forwarded.split(",")[0];
            for (String part : first.split(";")) {
                String[] kv = part.trim().split("=", 2);
                if (kv.length == 2 && key.equalsIgnoreCase(kv[0].trim())) {
                    String value = kv[1].trim();
                    // 쿼트 제거
                    if (value.startsWith("\"") && value.endsWith("\"")) {
                        value = value.substring(1, value.length() - 1);
                    }
                    return value;
                }
            }
        } catch (Exception ignored) { }
        return null;
    }

    private boolean isSafeHost(String host) {
        // 간단한 화이트리스트 패턴: 도메인/IP:포트 허용
        // IPv6 등 복잡한 케이스는 필요 시 확장
        return host != null && host.matches("^[A-Za-z0-9\\.-]+(:[0-9]{1,5})?$");
    }

    private String buildBaseUrl(String proto, String host, String forwardedPort) {
        String portPart = "";
        if (forwardedPort != null && forwardedPort.matches("^[0-9]{1,5}$")) {
            int p = Integer.parseInt(forwardedPort);
            if (!isDefaultPortForScheme(p, proto)) {
                portPart = ":" + p;
            }
            // host에 이미 포트가 있으면 host 우선
            if (host.contains(":")) {
                portPart = "";
            }
        }
        return proto + "://" + host + portPart + "/uploads";
    }

    private boolean isDefaultPortForScheme(int port, String scheme) {
        return ("http".equalsIgnoreCase(scheme) && port == 80) ||
               ("https".equalsIgnoreCase(scheme) && port == 443);
    }

    private String normalizePortForScheme(int port, String scheme) {
        if (isDefaultPortForScheme(port, scheme)) return "";
        return ":" + port;
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
