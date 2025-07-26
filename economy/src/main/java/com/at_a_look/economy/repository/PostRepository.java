package com.at_a_look.economy.repository;

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
public interface PostRepository extends JpaRepository<Post, Long> {

    // 특정 게시판의 게시글 목록 (페이징, 최신순)
    Page<Post> findByBoardTypeAndIsDeletedFalseOrderByCreatedAtDesc(Post.BoardType boardType, Pageable pageable);

    // 특정 게시판의 게시글 목록 (페이징, 인기순 - 좋아요 수 기준)
    Page<Post> findByBoardTypeAndIsDeletedFalseOrderByLikeCountDescCreatedAtDesc(Post.BoardType boardType, Pageable pageable);

    // 전체 게시글 목록 (페이징, 최신순)
    Page<Post> findByIsDeletedFalseOrderByCreatedAtDesc(Pageable pageable);

    // 특정 사용자의 게시글 목록
    Page<Post> findByUserAndIsDeletedFalseOrderByCreatedAtDesc(User user, Pageable pageable);

    // 제목 또는 내용으로 검색
    @Query("SELECT p FROM Post p WHERE p.isDeleted = false AND (p.title LIKE %:keyword% OR p.content LIKE %:keyword%) ORDER BY p.createdAt DESC")
    Page<Post> findByTitleOrContentContaining(@Param("keyword") String keyword, Pageable pageable);

    // 특정 게시판에서 제목 또는 내용으로 검색
    @Query("SELECT p FROM Post p WHERE p.boardType = :boardType AND p.isDeleted = false AND (p.title LIKE %:keyword% OR p.content LIKE %:keyword%) ORDER BY p.createdAt DESC")
    Page<Post> findByBoardTypeAndTitleOrContentContaining(@Param("boardType") Post.BoardType boardType, @Param("keyword") String keyword, Pageable pageable);

    // 태그로 검색
    @Query("SELECT p FROM Post p WHERE p.isDeleted = false AND p.tags LIKE %:tag% ORDER BY p.createdAt DESC")
    Page<Post> findByTagContaining(@Param("tag") String tag, Pageable pageable);

    // 인기 게시글 (특정 기간 내 좋아요 수가 많은 게시글)
    @Query("SELECT p FROM Post p WHERE p.isDeleted = false AND p.createdAt >= :fromDate ORDER BY p.likeCount DESC, p.createdAt DESC")
    Page<Post> findPopularPosts(@Param("fromDate") LocalDateTime fromDate, Pageable pageable);

    // 조회수 증가
    @Modifying
    @Query("UPDATE Post p SET p.viewCount = p.viewCount + 1 WHERE p.id = :postId")
    int incrementViewCount(@Param("postId") Long postId);

    // 좋아요 수 증가
    @Modifying
    @Query("UPDATE Post p SET p.likeCount = p.likeCount + 1 WHERE p.id = :postId")
    int incrementLikeCount(@Param("postId") Long postId);

    // 좋아요 수 감소
    @Modifying
    @Query("UPDATE Post p SET p.likeCount = p.likeCount - 1 WHERE p.id = :postId AND p.likeCount > 0")
    int decrementLikeCount(@Param("postId") Long postId);

    // 댓글 수 증가
    @Modifying
    @Query("UPDATE Post p SET p.commentCount = p.commentCount + 1 WHERE p.id = :postId")
    int incrementCommentCount(@Param("postId") Long postId);

    // 댓글 수 감소
    @Modifying
    @Query("UPDATE Post p SET p.commentCount = p.commentCount - 1 WHERE p.id = :postId AND p.commentCount > 0")
    int decrementCommentCount(@Param("postId") Long postId);

    // 게시판별 게시글 수
    long countByBoardTypeAndIsDeletedFalse(Post.BoardType boardType);

    // 특정 사용자의 게시글 수
    long countByUserAndIsDeletedFalse(User user);

    // 삭제되지 않은 게시글 조회 (ID로)
    Optional<Post> findByIdAndIsDeletedFalse(Long id);

    // 최근 인기 게시글 (7일 내)
    @Query("SELECT p FROM Post p WHERE p.isDeleted = false AND p.createdAt >= :weekAgo ORDER BY (p.likeCount * 2 + p.commentCount * 1.5 + p.viewCount * 0.1) DESC")
    List<Post> findTrendingPosts(@Param("weekAgo") LocalDateTime weekAgo, Pageable pageable);

    // 특정 사용자의 게시글 목록 (페이징)
    Page<Post> findByUserAndIsDeletedFalse(User user, Pageable pageable);

    // 특정 게시판의 최신 게시글 1개
    List<Post> findTop1ByBoardTypeAndIsDeletedFalseOrderByCreatedAtDesc(Post.BoardType boardType);

    // 전체 게시글 수 (삭제되지 않은 것만)
    long countByIsDeletedFalse();

    // 전체 게시글 목록 (페이징)
    Page<Post> findByIsDeletedFalse(Pageable pageable);
    
    // 관리자용 메서드
    @Query("SELECT p FROM Post p WHERE p.isDeleted = :isDeleted ORDER BY p.createdAt DESC")
    Page<Post> findByIsDeleted(@Param("isDeleted") Boolean isDeleted, Pageable pageable);
    
    @Query("SELECT p FROM Post p WHERE p.createdAt BETWEEN :startDate AND :endDate ORDER BY p.createdAt DESC")
    Page<Post> findByCreatedAtBetween(@Param("startDate") LocalDateTime startDate, @Param("endDate") LocalDateTime endDate, Pageable pageable);
    
    @Query("SELECT p FROM Post p WHERE p.title LIKE %:keyword% OR p.content LIKE %:keyword% OR p.user.username LIKE %:keyword% ORDER BY p.createdAt DESC")
    Page<Post> findByKeyword(@Param("keyword") String keyword, Pageable pageable);
    
    @Query("SELECT p FROM Post p WHERE p.boardType = :boardType AND (p.title LIKE %:keyword% OR p.content LIKE %:keyword% OR p.user.username LIKE %:keyword%) ORDER BY p.createdAt DESC")
    Page<Post> findByBoardTypeAndKeyword(@Param("boardType") Post.BoardType boardType, @Param("keyword") String keyword, Pageable pageable);
    
    // 관리자용: 모든 게시글 조회 (삭제된 것 포함)
    @Query("SELECT p FROM Post p ORDER BY p.createdAt DESC")
    Page<Post> findAllForAdmin(Pageable pageable);
    
    long countByIsDeleted(Boolean isDeleted);
    
    long countByCreatedAtBetween(LocalDateTime startDate, LocalDateTime endDate);
    
    long countByCreatedAtAfter(LocalDateTime date);
} 