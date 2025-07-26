package com.at_a_look.economy.repository;

import com.at_a_look.economy.entity.PostBookmark;
import com.at_a_look.economy.entity.Post;
import com.at_a_look.economy.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PostBookmarkRepository extends JpaRepository<PostBookmark, Long> {
    
    Optional<PostBookmark> findByUserAndPost(User user, Post post);
    
    boolean existsByUserAndPost(User user, Post post);
    
    long countByPost(Post post);
    
    void deleteByUserAndPost(User user, Post post);
    
    Page<PostBookmark> findByUserOrderByCreatedAtDesc(User user, Pageable pageable);
} 