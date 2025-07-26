package com.at_a_look.economy.repository;

import com.at_a_look.economy.entity.Post;
import com.at_a_look.economy.entity.PostImage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PostImageRepository extends JpaRepository<PostImage, Long> {

    // 특정 게시글의 이미지 목록 (표시 순서대로)
    List<PostImage> findByPostOrderByDisplayOrder(Post post);

    // 특정 게시글의 이미지 수
    long countByPost(Post post);

    // 특정 이미지 URL로 조회
    PostImage findByImageUrl(String imageUrl);

    // 특정 게시글의 첫 번째 이미지 (썸네일용)
    @Query("SELECT pi FROM PostImage pi WHERE pi.post = :post ORDER BY pi.displayOrder ASC")
    List<PostImage> findFirstImageByPost(@Param("post") Post post);

    // 게시글 삭제 시 관련 이미지들도 삭제
    void deleteByPost(Post post);

    // 고아 이미지 찾기 (게시글이 없는 이미지)
    @Query("SELECT pi FROM PostImage pi WHERE pi.post IS NULL")
    List<PostImage> findOrphanImages();
} 