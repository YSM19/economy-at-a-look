package com.at_a_look.economy.repository;

import com.at_a_look.economy.entity.Inquiry;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface InquiryRepository extends JpaRepository<Inquiry, Long> {
    
    Page<Inquiry> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);
    
    Page<Inquiry> findByTypeOrderByCreatedAtDesc(Inquiry.Type type, Pageable pageable);
    
    Page<Inquiry> findByStatusOrderByCreatedAtDesc(Inquiry.Status status, Pageable pageable);
    
    @Query("SELECT i FROM Inquiry i WHERE " +
           "(:type IS NULL OR i.type = :type) AND " +
           "(:status IS NULL OR i.status = :status) " +
           "ORDER BY i.createdAt DESC")
    Page<Inquiry> findByTypeAndStatus(@Param("type") Inquiry.Type type, 
                                     @Param("status") Inquiry.Status status, 
                                     Pageable pageable);
    
    @Query("SELECT COUNT(i) FROM Inquiry i WHERE i.status = :status")
    long countByStatus(@Param("status") Inquiry.Status status);
} 