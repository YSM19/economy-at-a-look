package com.at_a_look.economy.service;

import com.at_a_look.economy.dto.PostDto;
import com.at_a_look.economy.entity.Post;
import com.at_a_look.economy.entity.PostImage;
import com.at_a_look.economy.entity.User;
import com.at_a_look.economy.entity.PostLike;
import com.at_a_look.economy.entity.PostBookmark;
import com.at_a_look.economy.repository.PostRepository;
import com.at_a_look.economy.repository.PostImageRepository;
import com.at_a_look.economy.repository.UserRepository;
import com.at_a_look.economy.repository.PostLikeRepository;
import com.at_a_look.economy.repository.PostBookmarkRepository;
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
public class PostService {

    private final PostRepository postRepository;
    private final PostImageRepository postImageRepository;
    private final UserRepository userRepository;
    private final PostLikeRepository postLikeRepository;
    private final PostBookmarkRepository postBookmarkRepository;
    private final NotificationService notificationService;
    private final ObjectMapper objectMapper;

    /**
     * 게시글 목록 조회
     */
    public PostDto.ListResponse getPosts(Post.BoardType boardType, String sortBy, int page, int size) {
        Pageable pageable = createPageable(page, size, sortBy);
        Page<Post> postPage;

        if (boardType != null) {
            if ("popular".equals(sortBy)) {
                postPage = postRepository.findByBoardTypeAndIsDeletedFalseOrderByLikeCountDescCreatedAtDesc(boardType, pageable);
            } else {
                postPage = postRepository.findByBoardTypeAndIsDeletedFalseOrderByCreatedAtDesc(boardType, pageable);
            }
        } else {
            postPage = postRepository.findByIsDeletedFalseOrderByCreatedAtDesc(pageable);
        }

        List<PostDto.SummaryResponse> posts = postPage.getContent().stream()
                .map(this::convertToSummaryDto)
                .collect(Collectors.toList());

        return PostDto.ListResponse.builder()
                .posts(posts.stream().map(this::summaryToResponse).collect(Collectors.toList()))
                .totalCount(postPage.getTotalElements())
                .currentPage(page)
                .totalPages(postPage.getTotalPages())
                .hasNext(postPage.hasNext())
                .sortBy(sortBy)
                .build();
    }

    /**
     * 게시글 상세 조회
     */
    @Transactional
    public PostDto.Response getPost(Long postId, String userEmail) {
        Post post = postRepository.findByIdAndIsDeletedFalse(postId)
                .orElseThrow(() -> new RuntimeException("게시글을 찾을 수 없습니다."));

        // 조회수 증가
        post.incrementViewCount();
        postRepository.save(post);

        return convertToResponseDto(post, userEmail);
    }

    /**
     * 게시글 생성
     */
    @Transactional
    public PostDto.Response createPost(String userEmail, PostDto.CreateRequest request) {
        User user = findUserByEmail(userEmail);

        Post post = Post.builder()
                .user(user)
                .title(request.getTitle())
                .content(request.getContent())
                .boardType(request.getBoardType())
                .tags(convertTagsToJson(request.getTags()))
                .build();

        Post savedPost = postRepository.save(post);

        // 이미지 처리
        if (request.getImages() != null && !request.getImages().isEmpty()) {
            List<PostImage> postImages = request.getImages().stream()
                    .map(imageInfo -> PostImage.builder()
                            .post(savedPost)
                            .imageUrl(imageInfo.getUploadedImageUrl())
                            .originalFilename(imageInfo.getOriginalFilename())
                            .fileSize(imageInfo.getFileSize())
                            .contentType(imageInfo.getContentType())
                            .displayOrder(imageInfo.getDisplayOrder())
                            .build())
                    .collect(Collectors.toList());

            postImageRepository.saveAll(postImages);
        }

        return convertToResponseDto(savedPost, userEmail);
    }

    /**
     * 게시글 수정
     */
    @Transactional
    public PostDto.Response updatePost(String userEmail, Long postId, PostDto.UpdateRequest request) {
        User user = findUserByEmail(userEmail);
        Post post = postRepository.findByIdAndIsDeletedFalse(postId)
                .orElseThrow(() -> new RuntimeException("게시글을 찾을 수 없습니다."));

        // 권한 확인
        if (!post.getUser().equals(user)) {
            throw new RuntimeException("게시글 수정 권한이 없습니다.");
        }

        // 기본 정보 수정
        post.setTitle(request.getTitle());
        post.setContent(request.getContent());
        post.setTags(convertTagsToJson(request.getTags()));

        // 이미지 처리
        if (request.getImages() != null) {
            // 기존 이미지 삭제 처리
            request.getImages().stream()
                    .filter(img -> img.getId() != null && Boolean.TRUE.equals(img.getIsDeleted()))
                    .forEach(img -> postImageRepository.deleteById(img.getId()));

            // 새 이미지 추가
            List<PostImage> newImages = request.getImages().stream()
                    .filter(img -> img.getId() == null && img.getUploadedImageUrl() != null)
                    .map(imageInfo -> PostImage.builder()
                            .post(post)
                            .imageUrl(imageInfo.getUploadedImageUrl())
                            .originalFilename(imageInfo.getOriginalFilename())
                            .fileSize(imageInfo.getFileSize())
                            .contentType(imageInfo.getContentType())
                            .displayOrder(imageInfo.getDisplayOrder())
                            .build())
                    .collect(Collectors.toList());

            if (!newImages.isEmpty()) {
                postImageRepository.saveAll(newImages);
            }
        }

        Post savedPost = postRepository.save(post);
        return convertToResponseDto(savedPost, userEmail);
    }

    /**
     * 게시글 삭제
     */
    @Transactional
    public void deletePost(String userEmail, Long postId) {
        User user = findUserByEmail(userEmail);
        Post post = postRepository.findByIdAndIsDeletedFalse(postId)
                .orElseThrow(() -> new RuntimeException("게시글을 찾을 수 없습니다."));

        // 권한 확인 (작성자 또는 관리자)
        if (!post.getUser().equals(user) && !user.getRole().equals(User.Role.ADMIN)) {
            throw new RuntimeException("게시글 삭제 권한이 없습니다.");
        }

        post.softDelete();
        postRepository.save(post);
    }

    /**
     * 게시글 검색
     */
    public PostDto.ListResponse searchPosts(PostDto.SearchRequest request) {
        Pageable pageable = createPageable(request.getPage(), request.getSize(), request.getSortBy());
        Page<Post> postPage;

        if (request.getBoardType() != null) {
            postPage = postRepository.findByBoardTypeAndTitleOrContentContaining(
                    request.getBoardType(), request.getKeyword(), pageable);
        } else {
            postPage = postRepository.findByTitleOrContentContaining(request.getKeyword(), pageable);
        }

        List<PostDto.SummaryResponse> posts = postPage.getContent().stream()
                .map(this::convertToSummaryDto)
                .collect(Collectors.toList());

        return PostDto.ListResponse.builder()
                .posts(posts.stream().map(this::summaryToResponse).collect(Collectors.toList()))
                .totalCount(postPage.getTotalElements())
                .currentPage(request.getPage())
                .totalPages(postPage.getTotalPages())
                .hasNext(postPage.hasNext())
                .sortBy(request.getSortBy())
                .build();
    }

    /**
     * 게시글 좋아요/취소
     */
    @Transactional
    public PostDto.LikeResponse toggleLike(String userEmail, Long postId) {
        User user = findUserByEmail(userEmail);
        Post post = postRepository.findByIdAndIsDeletedFalse(postId)
                .orElseThrow(() -> new RuntimeException("게시글을 찾을 수 없습니다."));

        // 현재 좋아요 상태 확인
        boolean isLiked = postLikeRepository.existsByUserAndPost(user, post);

        if (isLiked) {
            // 좋아요 취소
            postLikeRepository.deleteByUserAndPost(user, post);
            post.decrementLikeCount();
        } else {
            // 좋아요 추가
            PostLike postLike = PostLike.builder()
                    .user(user)
                    .post(post)
                    .build();
            postLikeRepository.save(postLike);
            post.incrementLikeCount();
            
            // 좋아요 알림 생성 (자신의 게시글이 아닌 경우)
            if (!post.getUser().equals(user)) {
                notificationService.createLikeNotification(
                        post.getUser().getId(), postId, user.getUsername());
            }
        }

        postRepository.save(post);

        return PostDto.LikeResponse.builder()
                .isLiked(!isLiked)
                .likeCount(post.getLikeCount())
                .build();
    }

    /**
     * 게시글 북마크 토글
     */
    @Transactional
    public PostDto.BookmarkResponse toggleBookmark(String userEmail, Long postId) {
        User user = findUserByEmail(userEmail);
        Post post = postRepository.findByIdAndIsDeletedFalse(postId)
                .orElseThrow(() -> new RuntimeException("게시글을 찾을 수 없습니다."));

        // 현재 북마크 상태 확인
        boolean isBookmarked = postBookmarkRepository.existsByUserAndPost(user, post);

        if (isBookmarked) {
            // 북마크 취소
            postBookmarkRepository.deleteByUserAndPost(user, post);
        } else {
            // 북마크 추가
            PostBookmark postBookmark = PostBookmark.builder()
                    .user(user)
                    .post(post)
                    .build();
            postBookmarkRepository.save(postBookmark);
        }

        // 북마크 개수 조회
        int bookmarkCount = (int) postBookmarkRepository.countByPost(post);

        return PostDto.BookmarkResponse.builder()
                .isBookmarked(!isBookmarked)
                .bookmarkCount(bookmarkCount)
                .build();
    }

    /**
     * 인기 게시글 조회
     */
    public List<PostDto.SummaryResponse> getTrendingPosts(int limit) {
        LocalDateTime weekAgo = LocalDateTime.now().minusDays(7);
        Pageable pageable = PageRequest.of(0, limit);
        
        List<Post> trendingPosts = postRepository.findTrendingPosts(weekAgo, pageable);
        
        return trendingPosts.stream()
                .map(this::convertToSummaryDto)
                .collect(Collectors.toList());
    }

    /**
     * 내 게시글 조회
     */
    public PostDto.ListResponse getMyPosts(String userEmail, int page, int size) {
        User user = findUserByEmail(userEmail);
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        
        Page<Post> postPage = postRepository.findByUserAndIsDeletedFalse(user, pageable);
        
        List<PostDto.SummaryResponse> posts = postPage.getContent().stream()
                .map(this::convertToSummaryDto)
                .collect(Collectors.toList());

        return PostDto.ListResponse.builder()
                .posts(posts.stream().map(this::summaryToResponse).collect(Collectors.toList()))
                .totalCount(postPage.getTotalElements())
                .currentPage(page)
                .totalPages(postPage.getTotalPages())
                .hasNext(postPage.hasNext())
                .sortBy("latest")
                .build();
    }

    /**
     * 북마크 목록 조회
     */
    public PostDto.ListResponse getBookmarks(String userEmail, int page, int size) {
        User user = findUserByEmail(userEmail);
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        
        Page<PostBookmark> bookmarkPage = postBookmarkRepository.findByUserOrderByCreatedAtDesc(user, pageable);
        
        List<PostDto.SummaryResponse> posts = bookmarkPage.getContent().stream()
                .map(bookmark -> convertToSummaryDto(bookmark.getPost()))
                .collect(Collectors.toList());

        return PostDto.ListResponse.builder()
                .posts(posts.stream().map(this::summaryToResponse).collect(Collectors.toList()))
                .totalCount(bookmarkPage.getTotalElements())
                .currentPage(page)
                .totalPages(bookmarkPage.getTotalPages())
                .hasNext(bookmarkPage.hasNext())
                .sortBy("latest")
                .build();
    }

    /**
     * 내 좋아요 목록 조회
     */
    public PostDto.ListResponse getMyLikes(String userEmail, int page, int size) {
        User user = findUserByEmail(userEmail);
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        
        Page<PostLike> likePage = postLikeRepository.findByUserOrderByCreatedAtDesc(user, pageable);
        
        List<PostDto.SummaryResponse> posts = likePage.getContent().stream()
                .map(like -> convertToSummaryDto(like.getPost()))
                .collect(Collectors.toList());

        return PostDto.ListResponse.builder()
                .posts(posts.stream().map(this::summaryToResponse).collect(Collectors.toList()))
                .totalCount(likePage.getTotalElements())
                .currentPage(page)
                .totalPages(likePage.getTotalPages())
                .hasNext(likePage.hasNext())
                .sortBy("latest")
                .build();
    }

    /**
     * 게시판 통계 조회
     */
    public PostDto.BoardStatsResponse getBoardStats() {
        List<PostDto.BoardStatsResponse.BoardStat> boardStats = new ArrayList<>();
        
        for (Post.BoardType boardType : Post.BoardType.values()) {
            long postCount = postRepository.countByBoardTypeAndIsDeletedFalse(boardType);
            
            // 각 게시판의 최신 게시글
            PostDto.SummaryResponse latestPost = null;
            List<Post> latestPosts = postRepository.findTop1ByBoardTypeAndIsDeletedFalseOrderByCreatedAtDesc(boardType);
            if (!latestPosts.isEmpty()) {
                latestPost = convertToSummaryDto(latestPosts.get(0));
            }
            
            PostDto.BoardStatsResponse.BoardStat boardStat = PostDto.BoardStatsResponse.BoardStat.builder()
                    .boardType(boardType.name())
                    .boardName(getBoardName(boardType))
                    .postCount(postCount)
                    .latestPost(latestPost)
                    .build();
            
            boardStats.add(boardStat);
        }
        
        // 전체 게시글 수
        long totalPosts = postRepository.countByIsDeletedFalse();
        
        // 최근 게시글 5개
        Pageable recentPageable = PageRequest.of(0, 5, Sort.by(Sort.Direction.DESC, "createdAt"));
        List<Post> recentPosts = postRepository.findByIsDeletedFalse(recentPageable).getContent();
        List<PostDto.SummaryResponse> recentPostsDto = recentPosts.stream()
                .map(this::convertToSummaryDto)
                .collect(Collectors.toList());
        
        return PostDto.BoardStatsResponse.builder()
                .boardStats(boardStats)
                .totalPosts(totalPosts)
                .recentPosts(recentPostsDto)
                .build();
    }

    private String getBoardName(Post.BoardType boardType) {
        return switch (boardType) {
            case FREE -> "자유게시판";
            case INVESTMENT -> "투자";
            case QNA -> "Q&A";
            case NEWS -> "뉴스";
            case SUGGESTION -> "건의 및 문의";
        };
    }

    private User findUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));
    }

    private Pageable createPageable(int page, int size, String sortBy) {
        Sort sort = switch (sortBy) {
            case "popular" -> Sort.by(Sort.Direction.DESC, "likeCount")
                    .and(Sort.by(Sort.Direction.DESC, "createdAt"));
            case "oldest" -> Sort.by(Sort.Direction.ASC, "createdAt");
            default -> Sort.by(Sort.Direction.DESC, "createdAt");
        };
        
        return PageRequest.of(page, size, sort);
    }

    private String convertTagsToJson(List<String> tags) {
        if (tags == null || tags.isEmpty()) {
            return null;
        }
        try {
            return objectMapper.writeValueAsString(tags);
        } catch (JsonProcessingException e) {
            log.error("태그를 JSON으로 변환하는 중 오류 발생", e);
            return null;
        }
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

    private PostDto.Response convertToResponseDto(Post post, String userEmail) {
        User currentUser = null;
        if (userEmail != null) {
            currentUser = userRepository.findByEmail(userEmail).orElse(null);
        }

        List<PostDto.Response.ImageInfo> images = postImageRepository.findByPostOrderByDisplayOrder(post)
                .stream()
                .map(img -> PostDto.Response.ImageInfo.builder()
                        .id(img.getId())
                        .imageUrl(img.getImageUrl())
                        .originalFilename(img.getOriginalFilename())
                        .fileSize(img.getFileSize())
                        .displayOrder(img.getDisplayOrder())
                        .build())
                .collect(Collectors.toList());

        PostDto.Response.AuthorInfo authorInfo = PostDto.Response.AuthorInfo.builder()
                .username(post.getUser().getUsername())
                .build();

        // 사용자 상호작용 상태 확인
        boolean isLiked = false;
        boolean isBookmarked = false;
        
        if (userEmail != null && currentUser != null) {
            isLiked = postLikeRepository.existsByUserAndPost(currentUser, post);
            isBookmarked = postBookmarkRepository.existsByUserAndPost(currentUser, post);
        }

        PostDto.Response.UserInteraction userInteraction = PostDto.Response.UserInteraction.builder()
                .isLiked(isLiked)
                .isBookmarked(isBookmarked)
                .build();

        return PostDto.Response.builder()
                .id(post.getId())
                .title(post.getTitle())
                .content(post.getContent())
                .boardType(post.getBoardType().name())
                .tags(convertJsonToTags(post.getTags()))
                .viewCount(post.getViewCount())
                .likeCount(post.getLikeCount())
                .commentCount(post.getCommentCount())
                .createdAt(post.getCreatedAt())
                .updatedAt(post.getUpdatedAt())
                .author(authorInfo)
                .images(images)
                .userInteraction(userInteraction)
                .build();
    }

    private PostDto.SummaryResponse convertToSummaryDto(Post post) {
        String contentPreview = post.getContent().length() > 100 
                ? post.getContent().substring(0, 100) + "..."
                : post.getContent();

        String thumbnailImageUrl = null;
        List<PostImage> images = postImageRepository.findFirstImageByPost(post);
        if (!images.isEmpty()) {
            thumbnailImageUrl = images.get(0).getImageUrl();
        }

        PostDto.SummaryResponse.AuthorInfo authorInfo = PostDto.SummaryResponse.AuthorInfo.builder()
                .username(post.getUser().getUsername())
                .build();

        // 사용자 상호작용 상태 확인 (요약에서는 기본값 사용)
        PostDto.SummaryResponse.UserInteraction userInteraction = PostDto.SummaryResponse.UserInteraction.builder()
                .isLiked(false) // 요약에서는 개별 확인하지 않음
                .isBookmarked(false) // 요약에서는 개별 확인하지 않음
                .build();

        return PostDto.SummaryResponse.builder()
                .id(post.getId())
                .title(post.getTitle())
                .contentPreview(contentPreview)
                .boardType(post.getBoardType().name())
                .tags(convertJsonToTags(post.getTags()))
                .viewCount(post.getViewCount())
                .likeCount(post.getLikeCount())
                .commentCount(post.getCommentCount())
                .createdAt(post.getCreatedAt())
                .author(authorInfo)
                .thumbnailImageUrl(thumbnailImageUrl)
                .userInteraction(userInteraction)
                .build();
    }

    private PostDto.Response summaryToResponse(PostDto.SummaryResponse summary) {
        PostDto.Response.AuthorInfo authorInfo = PostDto.Response.AuthorInfo.builder()
                .username(summary.getAuthor().getUsername())
                .build();

        PostDto.Response.UserInteraction userInteraction = PostDto.Response.UserInteraction.builder()
                .isLiked(summary.getUserInteraction().getIsLiked())
                .isBookmarked(summary.getUserInteraction().getIsBookmarked())
                .build();

        return PostDto.Response.builder()
                .id(summary.getId())
                .title(summary.getTitle())
                .content(summary.getContentPreview())
                .boardType(summary.getBoardType())
                .tags(summary.getTags())
                .viewCount(summary.getViewCount())
                .likeCount(summary.getLikeCount())
                .commentCount(summary.getCommentCount())
                .createdAt(summary.getCreatedAt())
                .author(authorInfo)
                .userInteraction(userInteraction)
                .build();
    }
} 