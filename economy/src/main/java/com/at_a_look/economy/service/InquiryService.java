package com.at_a_look.economy.service;

import com.at_a_look.economy.dto.InquiryDto;
import com.at_a_look.economy.entity.Inquiry;
import com.at_a_look.economy.entity.User;
import com.at_a_look.economy.repository.InquiryRepository;
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
@Transactional
public class InquiryService {

    private final InquiryRepository inquiryRepository;
    private final UserRepository userRepository;

    public InquiryDto createInquiry(Long userId, InquiryDto dto) {
        User user = null;
        if (userId != null) {
            user = userRepository.findById(userId)
                    .orElse(null);
        }

        Inquiry inquiry = Inquiry.builder()
                .user(user)
                .title(dto.getTitle())
                .content(dto.getContent())
                .type(Inquiry.Type.valueOf(dto.getType()))
                .status(Inquiry.Status.PENDING)
                .userEmail(dto.getUserEmail())
                .userName(dto.getUserName())
                .build();

        Inquiry savedInquiry = inquiryRepository.save(inquiry);
        return InquiryDto.fromEntity(savedInquiry);
    }

    public Page<InquiryDto> getUserInquiries(Long userId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<Inquiry> inquiries = inquiryRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable);
        return inquiries.map(InquiryDto::fromEntity);
    }

    public InquiryDto getInquiry(Long inquiryId, Long userId) {
        Inquiry inquiry = inquiryRepository.findById(inquiryId)
                .orElseThrow(() -> new RuntimeException("문의를 찾을 수 없습니다."));

        // 사용자 본인의 문의만 조회 가능 (관리자 제외)
        if (userId != null && inquiry.getUser() != null && !inquiry.getUser().getId().equals(userId)) {
            throw new RuntimeException("접근 권한이 없습니다.");
        }

        return InquiryDto.fromEntity(inquiry);
    }

    public Page<InquiryDto> getAllInquiries(Inquiry.Type type, Inquiry.Status status, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<Inquiry> inquiries = inquiryRepository.findByTypeAndStatus(type, status, pageable);
        return inquiries.map(InquiryDto::fromEntity);
    }

    public InquiryDto updateInquiryStatus(Long inquiryId, Inquiry.Status status, String adminResponse, String respondedBy) {
        Inquiry inquiry = inquiryRepository.findById(inquiryId)
                .orElseThrow(() -> new RuntimeException("문의를 찾을 수 없습니다."));

        inquiry.setStatus(status);
        inquiry.setAdminResponse(adminResponse);
        inquiry.setRespondedBy(respondedBy);
        inquiry.setRespondedAt(LocalDateTime.now());

        Inquiry savedInquiry = inquiryRepository.save(inquiry);
        return InquiryDto.fromEntity(savedInquiry);
    }

    public long getPendingInquiryCount() {
        return inquiryRepository.countByStatus(Inquiry.Status.PENDING);
    }

    public List<InquiryDto> getInquiryTypes() {
        List<InquiryDto> types = List.of(
            InquiryDto.builder()
                .type("SUGGESTION")
                .typeDisplayName("건의사항")
                .build(),
            InquiryDto.builder()
                .type("BUG_REPORT")
                .typeDisplayName("버그신고")
                .build(),
            InquiryDto.builder()
                .type("FEATURE_REQUEST")
                .typeDisplayName("기능요청")
                .build(),
            InquiryDto.builder()
                .type("GENERAL_INQUIRY")
                .typeDisplayName("일반문의")
                .build(),
            InquiryDto.builder()
                .type("ACCOUNT_ISSUE")
                .typeDisplayName("계정문제")
                .build(),
            InquiryDto.builder()
                .type("TECHNICAL_ISSUE")
                .typeDisplayName("기술적문제")
                .build()
        );
        return types;
    }

    public List<InquiryDto> getInquiryStatuses() {
        List<InquiryDto> statuses = List.of(
            InquiryDto.builder()
                .status("PENDING")
                .statusDisplayName("대기중")
                .build(),
            InquiryDto.builder()
                .status("IN_PROGRESS")
                .statusDisplayName("처리중")
                .build(),
            InquiryDto.builder()
                .status("COMPLETED")
                .statusDisplayName("완료")
                .build(),
            InquiryDto.builder()
                .status("REJECTED")
                .statusDisplayName("거절")
                .build()
        );
        return statuses;
    }
} 