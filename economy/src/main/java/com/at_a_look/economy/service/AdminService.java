package com.at_a_look.economy.service;

import com.at_a_look.economy.dto.AdminDto;
import com.at_a_look.economy.entity.Comment;
import com.at_a_look.economy.entity.Post;
import com.at_a_look.economy.entity.PostImage;
import com.at_a_look.economy.entity.Report;
import com.at_a_look.economy.entity.User;
import com.at_a_look.economy.repository.CommentRepository;
import com.at_a_look.economy.repository.PostImageRepository;
import com.at_a_look.economy.repository.PostRepository;
import com.at_a_look.economy.repository.ReportRepository;
import com.at_a_look.economy.repository.UserRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class AdminService {

    private final PostRepository postRepository;
    private final CommentRepository commentRepository;
    private final UserRepository userRepository;
    private final PostImageRepository postImageRepository;
    private final ReportRepository reportRepository;
    private final ObjectMapper objectMapper;

    /**
     * 게시글 관리 목록 조회
     */
    public AdminDto.PostListResponse getPostManagementList(AdminDto.SearchRequest request) {
        log.info("게시글 관리 목록 조회 요청 - keyword: {}, boardType: {}, isDeleted: {}, startDate: {}, endDate: {}", 
                request.getKeyword(), request.getBoardType(), request.getIsDeleted(), request.getStartDate(), request.getEndDate());
        
        Pageable pageable = createPageable(request.getPage(), request.getSize(), request.getSortBy(), request.getSortOrder());
        
        Page<Post> postPage;
        
        if (request.getKeyword() != null && !request.getKeyword().trim().isEmpty()) {
            if (request.getBoardType() != null) {
                postPage = postRepository.findByBoardTypeAndKeyword(
                    Post.BoardType.valueOf(request.getBoardType()), 
                    request.getKeyword(), 
                    pageable
                );
            } else {
                postPage = postRepository.findByKeyword(request.getKeyword(), pageable);
            }
        } else if (request.getIsDeleted() != null) {
            log.info("isDeleted 파라미터로 조회: {}", request.getIsDeleted());
            postPage = postRepository.findByIsDeleted(request.getIsDeleted(), pageable);
        } else if (request.getStartDate() != null && request.getEndDate() != null) {
            postPage = postRepository.findByCreatedAtBetween(request.getStartDate(), request.getEndDate(), pageable);
        } else {
            // 관리자용: 모든 게시글 조회 (삭제된 것 포함)
            log.info("모든 게시글 조회 (삭제된 것 포함)");
            postPage = postRepository.findAllForAdmin(pageable);
        }
        
        log.info("조회된 게시글 수: {}", postPage.getTotalElements());
        log.info("게시글 목록: {}", postPage.getContent().stream()
                .map(post -> String.format("ID: %d, 제목: %s, 삭제여부: %s", 
                        post.getId(), 
                        post.getTitle(), 
                        post.getIsDeleted()))
                .collect(Collectors.joining(", ")));

        List<AdminDto.PostManagementResponse> posts = postPage.getContent().stream()
                .map(this::convertToPostManagementDto)
                .collect(Collectors.toList());

        return AdminDto.PostListResponse.builder()
                .posts(posts)
                .totalCount(postPage.getTotalElements())
                .currentPage(postPage.getNumber())
                .totalPages(postPage.getTotalPages())
                .hasNext(postPage.hasNext())
                .build();
    }

    /**
     * 댓글 관리 목록 조회
     */
    public AdminDto.CommentListResponse getCommentManagementList(AdminDto.SearchRequest request) {
        Pageable pageable = createPageable(request.getPage(), request.getSize(), request.getSortBy(), request.getSortOrder());
        
        Page<Comment> commentPage;
        
        if (request.getKeyword() != null && !request.getKeyword().trim().isEmpty()) {
            commentPage = commentRepository.findByKeyword(request.getKeyword(), pageable);
        } else if (request.getIsDeleted() != null) {
            commentPage = commentRepository.findByIsDeleted(request.getIsDeleted(), pageable);
        } else if (request.getStartDate() != null && request.getEndDate() != null) {
            commentPage = commentRepository.findByCreatedAtBetween(request.getStartDate(), request.getEndDate(), pageable);
        } else {
            // 관리자용: 모든 댓글 조회 (삭제된 것 포함)
            commentPage = commentRepository.findAllForAdmin(pageable);
        }

        List<AdminDto.CommentManagementResponse> comments = commentPage.getContent().stream()
                .map(this::convertToCommentManagementDto)
                .collect(Collectors.toList());

        return AdminDto.CommentListResponse.builder()
                .comments(comments)
                .totalCount(commentPage.getTotalElements())
                .currentPage(commentPage.getNumber())
                .totalPages(commentPage.getTotalPages())
                .hasNext(commentPage.hasNext())
                .build();
    }

    /**
     * 커뮤니티 통계 조회
     */
    public AdminDto.CommunityStatsResponse getCommunityStats() {
        LocalDateTime today = LocalDateTime.now().withHour(0).withMinute(0).withSecond(0).withNano(0);
        LocalDateTime tomorrow = today.plusDays(1);

        long totalPosts = postRepository.countByIsDeletedFalse();
        long totalComments = commentRepository.countByIsDeletedFalse();
        long totalUsers = userRepository.count();
        long todayPosts = postRepository.countByCreatedAtBetween(today, tomorrow);
        long todayComments = commentRepository.countByCreatedAtBetween(today, tomorrow);
        long deletedPosts = postRepository.countByIsDeleted(true);
        long deletedComments = commentRepository.countByIsDeleted(true);

        List<AdminDto.BoardStats> boardStats = new ArrayList<>();
        for (Post.BoardType boardType : Post.BoardType.values()) {
            long postCount = postRepository.countByBoardTypeAndIsDeletedFalse(boardType);
            long commentCount = commentRepository.countByPostAndIsDeletedFalse(null); // TODO: 게시판별 댓글 수 계산
            long todayBoardPosts = 0; // TODO: 게시판별 오늘 게시글 수 계산
            long todayBoardComments = 0; // TODO: 게시판별 오늘 댓글 수 계산

            boardStats.add(AdminDto.BoardStats.builder()
                    .boardType(boardType.name())
                    .boardName(getBoardName(boardType))
                    .postCount(postCount)
                    .commentCount(commentCount)
                    .todayPosts(todayBoardPosts)
                    .todayComments(todayBoardComments)
                    .build());
        }

        return AdminDto.CommunityStatsResponse.builder()
                .totalPosts(totalPosts)
                .totalComments(totalComments)
                .totalUsers(totalUsers)
                .todayPosts(todayPosts)
                .todayComments(todayComments)
                .deletedPosts(deletedPosts)
                .deletedComments(deletedComments)
                .boardStats(boardStats)
                .build();
    }

    /**
     * 게시글 일괄 삭제
     */
    @Transactional
    public void bulkDeletePosts(AdminDto.BulkActionRequest request) {
        List<Post> posts = postRepository.findAllById(request.getIds());
        
        for (Post post : posts) {
            post.setIsDeleted(true);
            post.setUpdatedAt(LocalDateTime.now());
        }
        
        postRepository.saveAll(posts);
        log.info("관리자가 {}개의 게시글을 일괄 삭제했습니다. 사유: {}", posts.size(), request.getReason());
    }

    /**
     * 게시글 일괄 복구
     */
    @Transactional
    public void bulkRestorePosts(AdminDto.BulkActionRequest request) {
        List<Post> posts = postRepository.findAllById(request.getIds());
        
        for (Post post : posts) {
            post.setIsDeleted(false);
            post.setUpdatedAt(LocalDateTime.now());
        }
        
        postRepository.saveAll(posts);
        log.info("관리자가 {}개의 게시글을 일괄 복구했습니다.", posts.size());
    }

    /**
     * 댓글 일괄 삭제
     */
    @Transactional
    public void bulkDeleteComments(AdminDto.BulkActionRequest request) {
        List<Comment> comments = commentRepository.findAllById(request.getIds());
        
        for (Comment comment : comments) {
            comment.setIsDeleted(true);
            comment.setUpdatedAt(LocalDateTime.now());
        }
        
        commentRepository.saveAll(comments);
        log.info("관리자가 {}개의 댓글을 일괄 삭제했습니다. 사유: {}", comments.size(), request.getReason());
    }

    /**
     * 댓글 일괄 복구
     */
    @Transactional
    public void bulkRestoreComments(AdminDto.BulkActionRequest request) {
        List<Comment> comments = commentRepository.findAllById(request.getIds());
        
        for (Comment comment : comments) {
            comment.setIsDeleted(false);
            comment.setUpdatedAt(LocalDateTime.now());
        }
        
        commentRepository.saveAll(comments);
        log.info("관리자가 {}개의 댓글을 일괄 복구했습니다.", comments.size());
    }

    /**
     * 신고 관리 목록 조회
     */
    public AdminDto.ReportListResponse getReportManagementList(AdminDto.ReportSearchRequest request) {
        Pageable pageable = createPageable(request.getPage(), request.getSize(), request.getSortBy(), request.getSortOrder());
        Page<Report> reportPage;
        if (request.getStatus() != null && !"all".equals(request.getStatus())) {
            Report.ReportStatus status = Report.ReportStatus.valueOf(request.getStatus().toUpperCase());
            reportPage = reportRepository.findByStatusOrderByCreatedAtDesc(status, pageable);
        } else {
            reportPage = reportRepository.findAllByOrderByCreatedAtDesc(pageable);
        }
        List<AdminDto.ReportManagementResponse> reports = reportPage.getContent().stream()
                .map(this::convertToReportManagementDto)
                .collect(Collectors.toList());
        return AdminDto.ReportListResponse.builder()
                .reports(reports)
                .totalCount(reportPage.getTotalElements())
                .currentPage(reportPage.getNumber())
                .totalPages(reportPage.getTotalPages())
                .hasNext(reportPage.hasNext())
                .build();
    }

    /**
     * 신고 승인
     */
    @Transactional
    public String approveReport(Long reportId, AdminDto.ReportActionRequest request) {
        Report report = reportRepository.findById(reportId)
                .orElseThrow(() -> new RuntimeException("신고를 찾을 수 없습니다."));
        if (report.getStatus() != Report.ReportStatus.PENDING) {
            throw new RuntimeException("이미 처리된 신고입니다.");
        }
        
        // reviewer는 관리자 계정으로 대체 (실제 구현 시 인증된 관리자 User 객체로 대체)
        User reviewer = userRepository.findByEmail("admin@admin.com").orElse(null);
        
        String originalTitle = null;
        String originalContent = null;
        String originalAuthor = null;
        
        // 원본 데이터 저장
        if (report.getTargetType() == Report.TargetType.POST) {
            Post post = postRepository.findById(report.getTargetId())
                    .orElseThrow(() -> new RuntimeException("게시글을 찾을 수 없습니다."));
            originalTitle = post.getTitle();
            originalContent = post.getContent();
            originalAuthor = post.getUser() != null ? post.getUser().getUsername() : null;
            
            // 게시글 삭제 처리
            post.setIsDeleted(true);
            post.setUpdatedAt(java.time.LocalDateTime.now());
            postRepository.save(post);
        } else if (report.getTargetType() == Report.TargetType.COMMENT) {
            Comment comment = commentRepository.findById(report.getTargetId())
                    .orElseThrow(() -> new RuntimeException("댓글을 찾을 수 없습니다."));
            originalTitle = comment.getContent(); // 댓글은 제목이 없으므로 내용을 제목으로 사용
            originalContent = comment.getContent();
            originalAuthor = comment.getUser() != null ? comment.getUser().getUsername() : null;
            
            // 댓글 삭제 처리
            comment.setIsDeleted(true);
            comment.setUpdatedAt(java.time.LocalDateTime.now());
            commentRepository.save(comment);
        }
        
        // 신고 승인 처리 (원본 데이터와 함께)
        report.approve(reviewer, request.getReviewNote(), originalTitle, originalContent, originalAuthor);
        reportRepository.save(report);
        
        return "신고가 승인되었습니다.";
    }

    /**
     * 신고 반려
     */
    @Transactional
    public String rejectReport(Long reportId, AdminDto.ReportActionRequest request) {
        Report report = reportRepository.findById(reportId)
                .orElseThrow(() -> new RuntimeException("신고를 찾을 수 없습니다."));
        if (report.getStatus() != Report.ReportStatus.PENDING) {
            throw new RuntimeException("이미 처리된 신고입니다.");
        }
        User reviewer = userRepository.findByEmail("admin@admin.com").orElse(null);
        report.reject(reviewer, request.getReviewNote());
        reportRepository.save(report);
        return "신고가 반려되었습니다.";
    }

    private AdminDto.PostManagementResponse convertToPostManagementDto(Post post) {
        try {
            List<AdminDto.ImageInfo> images = new ArrayList<>();
            try {
                images = postImageRepository.findByPostOrderByDisplayOrder(post)
                        .stream()
                        .map(this::convertToImageInfo)
                        .collect(Collectors.toList());
            } catch (Exception e) {
                log.warn("게시글 {}의 이미지 정보 조회 실패: {}", post.getId(), e.getMessage());
            }

            String author = "알 수 없음";
            String authorEmail = "";
            try {
                if (post.getUser() != null) {
                    author = post.getUser().getUsername();
                    authorEmail = post.getUser().getEmail();
                }
            } catch (Exception e) {
                log.warn("게시글 {}의 사용자 정보 조회 실패: {}", post.getId(), e.getMessage());
            }

            return AdminDto.PostManagementResponse.builder()
                    .id(post.getId())
                    .title(post.getTitle() != null ? post.getTitle() : "")
                    .content(post.getContent() != null ? post.getContent() : "")
                    .boardType(post.getBoardType() != null ? post.getBoardType().name() : "UNKNOWN")
                    .author(author)
                    .authorEmail(authorEmail)
                    .createdAt(post.getCreatedAt())
                    .updatedAt(post.getUpdatedAt())
                    .viewCount(post.getViewCount() != null ? post.getViewCount() : 0)
                    .likeCount(post.getLikeCount() != null ? post.getLikeCount() : 0)
                    .commentCount(post.getCommentCount() != null ? post.getCommentCount() : 0)
                    .isDeleted(post.getIsDeleted() != null ? post.getIsDeleted() : false)
                    .tags(convertJsonToTags(post.getTags()))
                    .images(images)
                    .build();
        } catch (Exception e) {
            log.error("게시글 DTO 변환 중 오류 발생 - postId: {}", post.getId(), e);
            return AdminDto.PostManagementResponse.builder()
                    .id(post.getId())
                    .title(post.getTitle() != null ? post.getTitle() : "")
                    .content(post.getContent() != null ? post.getContent() : "")
                    .boardType("UNKNOWN")
                    .author("알 수 없음")
                    .authorEmail("")
                    .createdAt(post.getCreatedAt())
                    .updatedAt(post.getUpdatedAt())
                    .viewCount(0)
                    .likeCount(0)
                    .commentCount(0)
                    .isDeleted(post.getIsDeleted() != null ? post.getIsDeleted() : false)
                    .tags(new ArrayList<>())
                    .images(new ArrayList<>())
                    .build();
        }
    }

    private AdminDto.CommentManagementResponse convertToCommentManagementDto(Comment comment) {
        try {
            String postTitle = "삭제된 게시글";
            Long postId = null;
            
            // 게시글 정보 안전하게 가져오기
            try {
                if (comment.getPost() != null) {
                    postId = comment.getPost().getId();
                    postTitle = comment.getPost().getTitle();
                }
            } catch (Exception e) {
                log.warn("댓글 {}의 게시글 정보 조회 실패: {}", comment.getId(), e.getMessage());
                postTitle = "삭제된 게시글";
                postId = null;
            }
            
            return AdminDto.CommentManagementResponse.builder()
                    .id(comment.getId())
                    .content(comment.getContent() != null ? comment.getContent() : "")
                    .author(comment.getUser() != null ? comment.getUser().getUsername() : "알 수 없음")
                    .authorEmail(comment.getUser() != null ? comment.getUser().getEmail() : "")
                    .postId(postId)
                    .postTitle(postTitle)
                    .createdAt(comment.getCreatedAt())
                    .updatedAt(comment.getUpdatedAt())
                    .likeCount(comment.getLikeCount() != null ? comment.getLikeCount() : 0)
                    .isDeleted(comment.getIsDeleted() != null ? comment.getIsDeleted() : false)
                    .build();
        } catch (Exception e) {
            log.error("댓글 DTO 변환 중 오류 발생 - commentId: {}", comment.getId(), e);
            return AdminDto.CommentManagementResponse.builder()
                    .id(comment.getId())
                    .content(comment.getContent() != null ? comment.getContent() : "")
                    .author("알 수 없음")
                    .authorEmail("")
                    .postId(null)
                    .postTitle("삭제된 게시글")
                    .createdAt(comment.getCreatedAt())
                    .updatedAt(comment.getUpdatedAt())
                    .likeCount(comment.getLikeCount() != null ? comment.getLikeCount() : 0)
                    .isDeleted(comment.getIsDeleted() != null ? comment.getIsDeleted() : false)
                    .build();
        }
    }

    private AdminDto.ImageInfo convertToImageInfo(PostImage image) {
        return AdminDto.ImageInfo.builder()
                .id(image.getId())
                .imageUrl(image.getImageUrl())
                .originalFilename(image.getOriginalFilename())
                .fileSize(image.getFileSize())
                .displayOrder(image.getDisplayOrder())
                .build();
    }

    private List<String> convertJsonToTags(String tagsJson) {
        if (tagsJson == null || tagsJson.isEmpty()) {
            return new ArrayList<>();
        }
        try {
            return objectMapper.readValue(tagsJson, new TypeReference<List<String>>() {});
        } catch (JsonProcessingException e) {
            log.error("JSON을 태그로 변환하는 중 오류 발생", e);
            return new ArrayList<>();
        }
    }

    private String getBoardName(Post.BoardType boardType) {
        switch (boardType) {
            case FREE: return "자유게시판";
            case INVESTMENT: return "투자 정보 공유";
            case QNA: return "질문 & 답변";
            case NEWS: return "경제 뉴스 토론";
            case SUGGESTION: return "건의 및 문의";
            default: return boardType.name();
        }
    }

    private Pageable createPageable(Integer page, Integer size, String sortBy, String sortOrder) {
        int pageNum = page != null ? page : 0;
        int pageSize = size != null ? size : 20;
        String sortField = sortBy != null ? sortBy : "createdAt";
        Sort.Direction direction = "asc".equalsIgnoreCase(sortOrder) ? Sort.Direction.ASC : Sort.Direction.DESC;
        
        return PageRequest.of(pageNum, pageSize, Sort.by(direction, sortField));
    }

    private AdminDto.ReportManagementResponse convertToReportManagementDto(Report report) {
        String targetTitle = null;
        String targetContent = null;
        String targetAuthor = null;
        
        // 승인된 신고의 경우 저장된 원본 데이터 사용
        if (report.getStatus() == Report.ReportStatus.APPROVED) {
            targetTitle = report.getOriginalTitle();
            targetContent = report.getOriginalContent();
            targetAuthor = report.getOriginalAuthor();
        } else {
            // 대기중이거나 반려된 신고의 경우 현재 데이터 조회
            if (report.getTargetType() == Report.TargetType.POST) {
                Post post = postRepository.findById(report.getTargetId()).orElse(null);
                if (post != null) {
                    targetTitle = post.getTitle();
                    targetContent = post.getContent();
                    targetAuthor = post.getUser() != null ? post.getUser().getUsername() : null;
                }
            } else if (report.getTargetType() == Report.TargetType.COMMENT) {
                Comment comment = commentRepository.findById(report.getTargetId()).orElse(null);
                if (comment != null) {
                    targetTitle = comment.getContent();
                    targetContent = comment.getContent();
                    targetAuthor = comment.getUser() != null ? comment.getUser().getUsername() : null;
                }
            }
        }
        
        // null 값 처리
        String displayTitle = targetTitle != null ? targetTitle : "[제목 없음]";
        String displayContent = targetContent != null ? targetContent : "[내용 없음]";
        String displayAuthor = targetAuthor != null ? targetAuthor : "[알 수 없음]";
        
        return AdminDto.ReportManagementResponse.builder()
                .id(report.getId())
                .targetType(report.getTargetType().name().toLowerCase())
                .targetId(report.getTargetId())
                .targetTitle(displayTitle)
                .targetContent(displayContent)
                .targetAuthor(displayAuthor)
                .reason(report.getReason() != null ? report.getReason().name().toLowerCase() : null)
                .reasonText(report.getReason() != null ? report.getReason().getDescription() : null)
                .details(report.getDetails())
                .reportedBy(report.getReporter() != null ? report.getReporter().getUsername() : null)
                .status(report.getStatus() != null ? report.getStatus().name().toLowerCase() : null)
                .createdAt(report.getCreatedAt())
                .reviewedAt(report.getReviewedAt())
                .reviewedBy(report.getReviewer() != null ? report.getReviewer().getUsername() : null)
                .reviewNote(report.getReviewNote())
                .build();
    }
} 