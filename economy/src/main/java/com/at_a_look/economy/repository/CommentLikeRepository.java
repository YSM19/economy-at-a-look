package com.at_a_look.economy.repository;

import com.at_a_look.economy.entity.CommentLike;
import com.at_a_look.economy.entity.Comment;
import com.at_a_look.economy.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CommentLikeRepository extends JpaRepository<CommentLike, Long> {
    
    Optional<CommentLike> findByUserAndComment(User user, Comment comment);
    
    boolean existsByUserAndComment(User user, Comment comment);
    
    long countByComment(Comment comment);
    
    void deleteByUserAndComment(User user, Comment comment);
} 