package com.at_a_look.economy.service;

import com.at_a_look.economy.dto.CommentDto;
import com.at_a_look.economy.entity.Comment;
import com.at_a_look.economy.entity.Post;
import com.at_a_look.economy.entity.User;
import com.at_a_look.economy.entity.CommentLike;
import com.at_a_look.economy.repository.CommentRepository;
import com.at_a_look.economy.repository.CommentLikeRepository;
import com.at_a_look.economy.repository.PostRepository;
import com.at_a_look.economy.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CommentService {

    private final CommentRepository commentRepository;
    private final PostRepository postRepository;
    private final UserRepository userRepository;
    private final CommentLikeRepository commentLikeRepository;
    private final NotificationService notificationService;

    @Transactional
    public CommentDto.Response createComment(String userEmail, CommentDto.CreateRequest request) {
        System.out.println("댓글 작성 시작 - userEmail: " + userEmail + ", request: " + request);
        
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));
        System.out.println("사용자 찾음: " + user.getUsername());
        
        Post post = postRepository.findById(request.getPostId())
                .orElseThrow(() -> new RuntimeException("게시글을 찾을 수 없습니다."));
        System.out.println("게시글 찾음: " + post.getTitle());

        Comment comment = Comment.builder()
                .post(post)
                .user(user)
                .content(request.getContent())
                .build();
        System.out.println("댓글 객체 생성: " + comment);

        if (request.getParentId() != null) {
            Comment parent = commentRepository.findById(request.getParentId())
                    .orElseThrow(() -> new RuntimeException("부모 댓글을 찾을 수 없습니다."));
            comment.setParent(parent);
        }

        Comment savedComment = commentRepository.save(comment);
        System.out.println("댓글 저장 완료: " + savedComment.getId());
        
        post.incrementCommentCount();
        postRepository.save(post);
        System.out.println("게시글 댓글 수 증가 완료");

        // 알림 생성
        if (!post.getUser().equals(user)) {
            try {
                notificationService.createCommentNotification(
                        post.getUser().getId(), post.getId(), savedComment.getId(), user.getUsername());
                System.out.println("알림 생성 완료");
            } catch (Exception e) {
                System.out.println("알림 생성 실패: " + e.getMessage());
            }
        }

        CommentDto.Response response = convertToDto(savedComment);
        System.out.println("댓글 작성 완료 - response: " + response);
        return response;
    }

    /**
     * 게시글의 댓글 목록 조회
     */
    public CommentDto.ListResponse getCommentsByPost(Long postId, int page, int size, String userEmail) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new RuntimeException("게시글을 찾을 수 없습니다."));
        
        org.springframework.data.domain.Pageable pageable = org.springframework.data.domain.PageRequest.of(page, size);
        org.springframework.data.domain.Page<Comment> commentPage = commentRepository.findByPostAndParentIsNullAndIsDeletedFalseOrderByCreatedAtDesc(post, pageable);
        
        java.util.List<CommentDto.Response> comments = commentPage.getContent().stream()
                .map(comment -> convertToDto(comment, userEmail))
                .collect(java.util.stream.Collectors.toList());
        
        CommentDto.ListResponse response = CommentDto.ListResponse.builder()
                .comments(comments)
                .totalCount(commentPage.getTotalElements())
                .currentPage(page)
                .totalPages(commentPage.getTotalPages())
                .hasNext(commentPage.hasNext())
                .build();
        
        System.out.println("댓글 목록 조회 결과 - postId: " + postId + ", 댓글 수: " + comments.size());
        System.out.println("응답 데이터: " + response);
        
        return response;
    }

    /**
     * 댓글 수정
     */
    @Transactional
    public CommentDto.Response updateComment(Long commentId, CommentDto.UpdateRequest request, String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));
        
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new RuntimeException("댓글을 찾을 수 없습니다."));
        
        // 권한 확인
        if (!comment.getUser().equals(user)) {
            throw new SecurityException("댓글 수정 권한이 없습니다.");
        }
        
        comment.setContent(request.getContent());
        comment.setUpdatedAt(java.time.LocalDateTime.now());
        Comment savedComment = commentRepository.save(comment);
        
        return convertToDto(savedComment);
    }

    /**
     * 댓글 삭제
     */
    @Transactional
    public void deleteComment(Long commentId, String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));
        
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new RuntimeException("댓글을 찾을 수 없습니다."));
        
        // 권한 확인
        if (!comment.getUser().equals(user)) {
            throw new SecurityException("댓글 삭제 권한이 없습니다.");
        }
        
        // 소프트 삭제
        comment.setIsDeleted(true);
        comment.setUpdatedAt(java.time.LocalDateTime.now());
        commentRepository.save(comment);
        
        // 게시글 댓글 수 감소
        Post post = comment.getPost();
        post.decrementCommentCount();
        postRepository.save(post);
    }

    /**
     * 댓글 좋아요 토글
     */
    @Transactional
    public CommentDto.LikeResponse toggleLike(Long commentId, String userEmail) {
        User user = findUserByEmail(userEmail);
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new RuntimeException("댓글을 찾을 수 없습니다."));

        // 현재 좋아요 상태 확인
        boolean isLiked = commentLikeRepository.existsByUserAndComment(user, comment);

        if (isLiked) {
            // 좋아요 취소
            commentLikeRepository.deleteByUserAndComment(user, comment);
            comment.decrementLikeCount();
        } else {
            // 좋아요 추가
            CommentLike commentLike = CommentLike.builder()
                    .user(user)
                    .comment(comment)
                    .build();
            commentLikeRepository.save(commentLike);
            comment.incrementLikeCount();
        }

        commentRepository.save(comment);

        return CommentDto.LikeResponse.builder()
                .isLiked(!isLiked)
                .likeCount(comment.getLikeCount())
                .build();
    }

    /**
     * 내 댓글 목록 조회
     */
    public CommentDto.ListResponse getMyComments(String userEmail, int page, int size) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));
        
        org.springframework.data.domain.Pageable pageable = org.springframework.data.domain.PageRequest.of(page, size);
        org.springframework.data.domain.Page<Comment> commentPage = commentRepository.findByUserAndIsDeletedFalseOrderByCreatedAtDesc(user, pageable);
        
        java.util.List<CommentDto.Response> comments = commentPage.getContent().stream()
                .map(this::convertToDto)
                .collect(java.util.stream.Collectors.toList());
        
        return CommentDto.ListResponse.builder()
                .comments(comments)
                .totalCount(commentPage.getTotalElements())
                .currentPage(page)
                .totalPages(commentPage.getTotalPages())
                .hasNext(commentPage.hasNext())
                .build();
    }

    /**
     * 특정 댓글의 답글 목록 조회
     */
    public CommentDto.ListResponse getReplies(Long commentId, int page, int size, String userEmail) {
        Comment parentComment = commentRepository.findById(commentId)
                .orElseThrow(() -> new RuntimeException("댓글을 찾을 수 없습니다."));
        
        org.springframework.data.domain.Pageable pageable = org.springframework.data.domain.PageRequest.of(page, size);
        org.springframework.data.domain.Page<Comment> replyPage = commentRepository.findByParentAndIsDeletedFalseOrderByCreatedAtAsc(parentComment, pageable);
        
        java.util.List<CommentDto.Response> replies = replyPage.getContent().stream()
                .map(this::convertToDto)
                .collect(java.util.stream.Collectors.toList());
        
        return CommentDto.ListResponse.builder()
                .comments(replies)
                .totalCount(replyPage.getTotalElements())
                .currentPage(page)
                .totalPages(replyPage.getTotalPages())
                .hasNext(replyPage.hasNext())
                .build();
    }

    private User findUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));
    }

    private CommentDto.Response convertToDto(Comment comment) {
        return convertToDto(comment, null);
    }

    private CommentDto.Response convertToDto(Comment comment, String userEmail) {
        CommentDto.Response.AuthorInfo authorInfo = CommentDto.Response.AuthorInfo.builder()
                .username(comment.getUser().getUsername())
                .build();

        // 게시글 정보 추가
        CommentDto.Response.PostInfo postInfo = CommentDto.Response.PostInfo.builder()
                .id(comment.getPost().getId())
                .title(comment.getPost().getTitle())
                .boardType(comment.getPost().getBoardType().name())
                .build();

        // 사용자 상호작용 정보 확인
        boolean isLiked = false;
        if (userEmail != null) {
            try {
                User user = findUserByEmail(userEmail);
                isLiked = commentLikeRepository.existsByUserAndComment(user, comment);
            } catch (Exception e) {
                // 사용자를 찾을 수 없는 경우 기본값 사용
            }
        }

        CommentDto.Response.UserInteraction userInteraction = CommentDto.Response.UserInteraction.builder()
                .isLiked(isLiked)
                .build();

        return CommentDto.Response.builder()
                .id(comment.getId())
                .content(comment.getContent())
                .likeCount(comment.getLikeCount())
                .createdAt(comment.getCreatedAt())
                .updatedAt(comment.getUpdatedAt())
                .author(authorInfo)
                .post(postInfo)
                .userInteraction(userInteraction)
                .build();
    }
} 