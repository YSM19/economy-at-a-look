package com.at_a_look.economy.service;

import com.at_a_look.economy.dto.NotificationDto;
import com.at_a_look.economy.entity.Notification;
import com.at_a_look.economy.entity.Post;
import com.at_a_look.economy.entity.Comment;
import com.at_a_look.economy.entity.User;
import com.at_a_look.economy.repository.NotificationRepository;
import com.at_a_look.economy.repository.PostRepository;
import com.at_a_look.economy.repository.CommentRepository;
import com.at_a_look.economy.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final PostRepository postRepository;
    private final CommentRepository commentRepository;

    /**
     * 사용자의 알림 목록 조회 (페이징)
     */
    public NotificationDto.ListResponse getNotifications(String userEmail, int page, int size) {
        User user = findUserByEmail(userEmail);
        Pageable pageable = PageRequest.of(page, size);
        
        Page<Notification> notificationPage = notificationRepository.findByUserOrderByCreatedAtDesc(user, pageable);
        long unreadCount = notificationRepository.countByUserAndIsReadFalse(user);
        
        List<NotificationDto.Response> notifications = notificationPage.getContent().stream()
                .map(this::convertToResponseDto)
                .collect(Collectors.toList());
        
        return NotificationDto.ListResponse.builder()
                .notifications(notifications)
                .totalCount(notificationPage.getTotalElements())
                .unreadCount(unreadCount)
                .currentPage(page)
                .totalPages(notificationPage.getTotalPages())
                .hasNext(notificationPage.hasNext())
                .build();
    }

    /**
     * 읽지 않은 알림 개수 조회
     */
    public NotificationDto.UnreadCountResponse getUnreadCount(String userEmail) {
        User user = findUserByEmail(userEmail);
        long unreadCount = notificationRepository.countByUserAndIsReadFalse(user);
        
        return NotificationDto.UnreadCountResponse.builder()
                .unreadCount(unreadCount)
                .build();
    }

    /**
     * 특정 알림 읽음 처리
     */
    @Transactional
    public void markAsRead(String userEmail, Long notificationId) {
        User user = findUserByEmail(userEmail);
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new RuntimeException("알림을 찾을 수 없습니다."));
        
        // 권한 확인 (본인의 알림만 읽음 처리 가능)
        if (!notification.getUser().equals(user)) {
            throw new RuntimeException("해당 알림에 대한 권한이 없습니다.");
        }
        
        notification.markAsRead();
        notificationRepository.save(notification);
    }

    /**
     * 모든 알림 읽음 처리
     */
    @Transactional
    public void markAllAsRead(String userEmail) {
        User user = findUserByEmail(userEmail);
        notificationRepository.markAllAsReadByUser(user, LocalDateTime.now());
    }

    /**
     * 알림 삭제
     */
    @Transactional
    public void deleteNotification(String userEmail, Long notificationId) {
        User user = findUserByEmail(userEmail);
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new RuntimeException("알림을 찾을 수 없습니다."));
        
        // 권한 확인
        if (!notification.getUser().equals(user)) {
            throw new RuntimeException("해당 알림에 대한 권한이 없습니다.");
        }
        
        notificationRepository.delete(notification);
    }

    /**
     * 좋아요 알림 생성
     */
    @Transactional
    public void createLikeNotification(Long targetUserId, Long postId, String likerUsername) {
        User targetUser = userRepository.findById(targetUserId)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));
        
        // 자기 자신의 게시글에 좋아요를 누른 경우 알림 생성하지 않음
        Post post = postRepository.findById(postId).orElse(null);
        if (post != null && post.getUser().equals(targetUser)) {
            return;
        }
        
        // 중복 알림 방지
        if (notificationRepository.existsByUserAndPostIdAndType(targetUser, postId, Notification.NotificationType.LIKE)) {
            return;
        }
        
        Notification notification = Notification.builder()
                .user(targetUser)
                .title("새로운 좋아요")
                .message(likerUsername + "님이 회원님의 글을 좋아합니다.")
                .type(Notification.NotificationType.LIKE)
                .postId(postId)
                .build();
        
        notificationRepository.save(notification);
    }

    /**
     * 댓글 알림 생성
     */
    @Transactional
    public void createCommentNotification(Long targetUserId, Long postId, Long commentId, String commenterUsername) {
        User targetUser = userRepository.findById(targetUserId)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));
        
        // 자기 자신의 댓글인 경우 알림 생성하지 않음
        Comment comment = commentRepository.findById(commentId).orElse(null);
        if (comment != null && comment.getUser().equals(targetUser)) {
            return;
        }
        
        Notification notification = Notification.builder()
                .user(targetUser)
                .title("새로운 댓글")
                .message(commenterUsername + "님이 회원님의 글에 댓글을 남겼습니다.")
                .type(Notification.NotificationType.COMMENT)
                .postId(postId)
                .commentId(commentId)
                .build();
        
        notificationRepository.save(notification);
    }

    /**
     * 답글 알림 생성
     */
    @Transactional
    public void createReplyNotification(Long targetUserId, Long postId, Long commentId, String replierUsername) {
        User targetUser = userRepository.findById(targetUserId)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));
        
        Notification notification = Notification.builder()
                .user(targetUser)
                .title("새로운 답글")
                .message(replierUsername + "님이 회원님의 댓글에 답글을 남겼습니다.")
                .type(Notification.NotificationType.REPLY)
                .postId(postId)
                .commentId(commentId)
                .build();
        
        notificationRepository.save(notification);
    }

    /**
     * 시스템 알림 생성
     */
    @Transactional
    public void createSystemNotification(Long userId, String title, String message) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));
        
        Notification notification = Notification.builder()
                .user(user)
                .title(title)
                .message(message)
                .type(Notification.NotificationType.SYSTEM)
                .build();
        
        notificationRepository.save(notification);
    }

    /**
     * 전체 사용자에게 시스템 알림 발송
     */
    @Transactional
    public void broadcastSystemNotification(String title, String message) {
        List<User> allUsers = userRepository.findAll();
        
        List<Notification> notifications = allUsers.stream()
                .map(user -> Notification.builder()
                        .user(user)
                        .title(title)
                        .message(message)
                        .type(Notification.NotificationType.SYSTEM)
                        .build())
                .collect(Collectors.toList());
        
        notificationRepository.saveAll(notifications);
    }

    /**
     * 오래된 읽은 알림 정리 (스케줄러에서 사용)
     */
    @Transactional
    public int cleanupOldReadNotifications(int daysOld) {
        LocalDateTime cutoffDate = LocalDateTime.now().minusDays(daysOld);
        return notificationRepository.deleteOldReadNotifications(cutoffDate);
    }

    private User findUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));
    }

    private NotificationDto.Response convertToResponseDto(Notification notification) {
        NotificationDto.Response.ResponseBuilder builder = NotificationDto.Response.builder()
                .id(notification.getId())
                .title(notification.getTitle())
                .message(notification.getMessage())
                .type(notification.getType().name())
                .isRead(notification.getIsRead())
                .postId(notification.getPostId())
                .commentId(notification.getCommentId())
                .targetUserId(notification.getTargetUserId())
                .createdAt(notification.getCreatedAt())
                .readAt(notification.getReadAt());

        // 게시글 정보 추가 (있는 경우)
        if (notification.getPostId() != null) {
            postRepository.findById(notification.getPostId()).ifPresent(post -> {
                NotificationDto.Response.PostInfo postInfo = NotificationDto.Response.PostInfo.builder()
                        .title(post.getTitle())
                        .author(post.getUser().getUsername())
                        .build();
                builder.postInfo(postInfo);
            });
        }

        return builder.build();
    }
} 