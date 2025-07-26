package com.at_a_look.economy.repository;

import com.at_a_look.economy.entity.Notification;
import com.at_a_look.economy.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {

    // 특정 사용자의 알림 목록 (페이징)
    Page<Notification> findByUserOrderByCreatedAtDesc(User user, Pageable pageable);

    // 특정 사용자의 읽지 않은 알림 개수
    long countByUserAndIsReadFalse(User user);

    // 특정 사용자의 읽지 않은 알림 목록
    List<Notification> findByUserAndIsReadFalseOrderByCreatedAtDesc(User user);

    // 특정 사용자의 알림을 모두 읽음 처리
    @Modifying
    @Query("UPDATE Notification n SET n.isRead = true, n.readAt = :readAt WHERE n.user = :user AND n.isRead = false")
    int markAllAsReadByUser(@Param("user") User user, @Param("readAt") LocalDateTime readAt);

    // 특정 기간보다 오래된 읽은 알림 삭제 (정리용)
    @Modifying
    @Query("DELETE FROM Notification n WHERE n.isRead = true AND n.createdAt < :cutoffDate")
    int deleteOldReadNotifications(@Param("cutoffDate") LocalDateTime cutoffDate);

    // 특정 게시글과 관련된 알림 목록
    List<Notification> findByPostIdOrderByCreatedAtDesc(Long postId);

    // 특정 댓글과 관련된 알림 목록
    List<Notification> findByCommentIdOrderByCreatedAtDesc(Long commentId);

    // 특정 타입의 알림 개수
    long countByUserAndType(User user, Notification.NotificationType type);

    // 특정 사용자가 특정 게시글에 대해 받은 알림이 있는지 확인 (중복 방지용)
    boolean existsByUserAndPostIdAndType(User user, Long postId, Notification.NotificationType type);

    // 특정 사용자가 특정 댓글에 대해 받은 알림이 있는지 확인 (중복 방지용)
    boolean existsByUserAndCommentIdAndType(User user, Long commentId, Notification.NotificationType type);
} 