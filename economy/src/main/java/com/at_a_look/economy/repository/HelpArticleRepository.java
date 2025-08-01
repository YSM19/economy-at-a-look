package com.at_a_look.economy.repository;

import com.at_a_look.economy.entity.HelpArticle;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface HelpArticleRepository extends JpaRepository<HelpArticle, Long> {
    
    Page<HelpArticle> findByIsActiveTrueOrderByDisplayOrderAsc(Pageable pageable);
    
    List<HelpArticle> findByCategoryAndIsActiveTrueOrderByDisplayOrderAsc(HelpArticle.Category category);
    
    @Query("SELECT h FROM HelpArticle h WHERE h.isActive = true AND " +
           "(LOWER(h.title) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "LOWER(h.content) LIKE LOWER(CONCAT('%', :keyword, '%'))) " +
           "ORDER BY h.displayOrder ASC")
    Page<HelpArticle> searchByKeyword(@Param("keyword") String keyword, Pageable pageable);
    
    @Query("SELECT h FROM HelpArticle h WHERE h.isActive = true AND h.category = :category AND " +
           "(LOWER(h.title) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "LOWER(h.content) LIKE LOWER(CONCAT('%', :keyword, '%'))) " +
           "ORDER BY h.displayOrder ASC")
    Page<HelpArticle> searchByCategoryAndKeyword(@Param("category") HelpArticle.Category category, 
                                                @Param("keyword") String keyword, 
                                                Pageable pageable);
    
    // 관리자용 메서드들
    Page<HelpArticle> findByCategoryOrderByDisplayOrderAsc(HelpArticle.Category category, Pageable pageable);
    
    Page<HelpArticle> findAllByOrderByDisplayOrderAsc(Pageable pageable);
    
    @Query("SELECT h FROM HelpArticle h WHERE " +
           "(LOWER(h.title) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "LOWER(h.content) LIKE LOWER(CONCAT('%', :keyword, '%'))) " +
           "ORDER BY h.displayOrder ASC")
    Page<HelpArticle> searchByKeywordAdmin(@Param("keyword") String keyword, Pageable pageable);
    
    @Query("SELECT h FROM HelpArticle h WHERE h.category = :category AND " +
           "(LOWER(h.title) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "LOWER(h.content) LIKE LOWER(CONCAT('%', :keyword, '%'))) " +
           "ORDER BY h.displayOrder ASC")
    Page<HelpArticle> searchByCategoryAndKeywordAdmin(@Param("category") HelpArticle.Category category, 
                                                     @Param("keyword") String keyword, 
                                                     Pageable pageable);
} 