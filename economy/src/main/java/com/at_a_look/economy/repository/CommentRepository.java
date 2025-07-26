package com.at_a_look.economy.repository;

import com.at_a_look.economy.entity.Comment;
import com.at_a_look.economy.entity.Post;
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
import java.util.Optional;

@Repository
public interface CommentRepository extends JpaRepository<Comment, Long> {

    // 특정 게시글의 댓글 목록 (부모 댓글만, 페이징)
    Page<Comment> findByPostAndParentIsNullAndIsDeletedFalseOrderByCreatedAtAsc(Post post, Pageable pageable);

    // 특정 게시글의 모든 댓글 목록 (삭제되지 않은 것만)
    List<Comment> findByPostAndIsDeletedFalseOrderByCreatedAtAsc(Post post);

    // 특정 댓글의 대댓글 목록
    List<Comment> findByParentAndIsDeletedFalseOrderByCreatedAtAsc(Comment parent);

    // 특정 사용자의 댓글 목록
    Page<Comment> findByUserAndIsDeletedFalseOrderByCreatedAtDesc(User user, Pageable pageable);

    // 삭제되지 않은 댓글 조회 (ID로)
    Optional<Comment> findByIdAndIsDeletedFalse(Long id);

    // 특정 게시글의 댓글 수 (대댓글 포함)
    long countByPostAndIsDeletedFalse(Post post);

    // 특정 사용자의 댓글 수
    long countByUserAndIsDeletedFalse(User user);

    // 특정 댓글의 대댓글 수
    long countByParentAndIsDeletedFalse(Comment parent);

    // 좋아요 수 증가
    @Modifying
    @Query("UPDATE Comment c SET c.likeCount = c.likeCount + 1 WHERE c.id = :commentId")
    int incrementLikeCount(@Param("commentId") Long commentId);

    // 좋아요 수 감소
    @Modifying
    @Query("UPDATE Comment c SET c.likeCount = c.likeCount - 1 WHERE c.id = :commentId AND c.likeCount > 0")
    int decrementLikeCount(@Param("commentId") Long commentId);

    // 특정 게시글의 최근 댓글 (미리보기용)
    @Query("SELECT c FROM Comment c WHERE c.post = :post AND c.isDeleted = false ORDER BY c.createdAt DESC")
    List<Comment> findRecentCommentsByPost(@Param("post") Post post, Pageable pageable);

    // 특정 사용자가 특정 게시글에 작성한 댓글 목록
    List<Comment> findByPostAndUserAndIsDeletedFalseOrderByCreatedAtAsc(Post post, User user);

    // 인기 댓글 (좋아요 수가 많은 댓글)
    @Query("SELECT c FROM Comment c WHERE c.post = :post AND c.isDeleted = false ORDER BY c.likeCount DESC, c.createdAt ASC")
    List<Comment> findPopularCommentsByPost(@Param("post") Post post, Pageable pageable);

    // 특정 키워드를 포함하는 댓글 검색
    @Query("SELECT c FROM Comment c WHERE c.isDeleted = false AND c.content LIKE %:keyword% ORDER BY c.createdAt DESC")
    Page<Comment> findByContentContaining(@Param("keyword") String keyword, Pageable pageable);

    // 특정 게시글의 댓글 목록 (부모 댓글만, 내림차순, 페이징)
    Page<Comment> findByPostAndParentIsNullAndIsDeletedFalseOrderByCreatedAtDesc(Post post, Pageable pageable);

    // 특정 댓글의 대댓글 목록 (페이징 지원)
    Page<Comment> findByParentAndIsDeletedFalseOrderByCreatedAtAsc(Comment parent, Pageable pageable);
    
    // 관리자용 메서드
    @Query("SELECT c FROM Comment c WHERE c.isDeleted = :isDeleted ORDER BY c.createdAt DESC")
    Page<Comment> findByIsDeleted(@Param("isDeleted") Boolean isDeleted, Pageable pageable);
    
    @Query("SELECT c FROM Comment c WHERE c.content LIKE %:keyword% OR c.user.username LIKE %:keyword% ORDER BY c.createdAt DESC")
    Page<Comment> findByKeyword(@Param("keyword") String keyword, Pageable pageable);
    
    // 관리자용: 모든 댓글 조회 (삭제된 것 포함)
    @Query("SELECT c FROM Comment c ORDER BY c.createdAt DESC")
    Page<Comment> findAllForAdmin(Pageable pageable);
    
    @Query("SELECT c FROM Comment c WHERE c.createdAt BETWEEN :startDate AND :endDate ORDER BY c.createdAt DESC")
    Page<Comment> findByCreatedAtBetween(@Param("startDate") LocalDateTime startDate, @Param("endDate") LocalDateTime endDate, Pageable pageable);
    
    long countByIsDeleted(Boolean isDeleted);
    
    long countByCreatedAtBetween(LocalDateTime startDate, LocalDateTime endDate);
    
    long countByCreatedAtAfter(LocalDateTime date);
    
    long countByIsDeletedFalse();
} 