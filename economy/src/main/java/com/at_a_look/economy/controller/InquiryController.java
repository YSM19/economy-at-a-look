package com.at_a_look.economy.controller;

import com.at_a_look.economy.dto.InquiryDto;
import com.at_a_look.economy.dto.response.ApiResponse;
import com.at_a_look.economy.entity.Inquiry;
import com.at_a_look.economy.service.InquiryService;
import com.at_a_look.economy.util.JwtTokenUtil;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/inquiries")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "건의 및 문의", description = "건의 및 문의 관련 API")
public class InquiryController {

    private final InquiryService inquiryService;
    private final JwtTokenUtil jwtTokenUtil;

    @PostMapping
    @Operation(summary = "문의 생성", description = "새로운 문의를 생성합니다.")
    public ResponseEntity<ApiResponse<InquiryDto>> createInquiry(
            @RequestHeader(value = "Authorization", required = false) String token,
            @RequestBody InquiryDto dto) {
        try {
            Long userId = null;
            if (token != null && !token.isEmpty()) {
                String jwt = token.replace("Bearer ", "");
                userId = jwtTokenUtil.getUserIdFromToken(jwt);
            }
            
            InquiryDto createdInquiry = inquiryService.createInquiry(userId, dto);
            
            return ResponseEntity.ok(ApiResponse.<InquiryDto>builder()
                    .success(true)
                    .message("문의가 성공적으로 생성되었습니다.")
                    .data(createdInquiry)
                    .build());
        } catch (Exception e) {
            log.error("문의 생성 중 오류 발생: ", e);
            return ResponseEntity.badRequest().body(ApiResponse.<InquiryDto>builder()
                    .success(false)
                    .message("문의 생성에 실패했습니다: " + e.getMessage())
                    .build());
        }
    }

    @GetMapping("/my")
    @Operation(summary = "내 문의 목록", description = "현재 사용자의 문의 목록을 조회합니다.")
    public ResponseEntity<ApiResponse<Page<InquiryDto>>> getMyInquiries(
            @RequestHeader("Authorization") String token,
            @Parameter(description = "페이지 번호 (0부터 시작)") @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "페이지 크기") @RequestParam(defaultValue = "10") int size) {
        try {
            String jwt = token.replace("Bearer ", "");
            Long userId = jwtTokenUtil.getUserIdFromToken(jwt);
            
            Page<InquiryDto> inquiries = inquiryService.getUserInquiries(userId, page, size);
            
            return ResponseEntity.ok(ApiResponse.<Page<InquiryDto>>builder()
                    .success(true)
                    .message("내 문의 목록을 성공적으로 조회했습니다.")
                    .data(inquiries)
                    .build());
        } catch (Exception e) {
            log.error("내 문의 목록 조회 중 오류 발생: ", e);
            return ResponseEntity.badRequest().body(ApiResponse.<Page<InquiryDto>>builder()
                    .success(false)
                    .message("내 문의 목록 조회에 실패했습니다: " + e.getMessage())
                    .build());
        }
    }

    @GetMapping("/{id}")
    @Operation(summary = "문의 상세 조회", description = "특정 문의의 상세 내용을 조회합니다.")
    public ResponseEntity<ApiResponse<InquiryDto>> getInquiry(
            @RequestHeader(value = "Authorization", required = false) String token,
            @Parameter(description = "문의 ID") @PathVariable Long id) {
        try {
            Long userId = null;
            if (token != null && !token.isEmpty()) {
                String jwt = token.replace("Bearer ", "");
                userId = jwtTokenUtil.getUserIdFromToken(jwt);
            }
            
            InquiryDto inquiry = inquiryService.getInquiry(id, userId);
            
            return ResponseEntity.ok(ApiResponse.<InquiryDto>builder()
                    .success(true)
                    .message("문의를 성공적으로 조회했습니다.")
                    .data(inquiry)
                    .build());
        } catch (Exception e) {
            log.error("문의 조회 중 오류 발생: ", e);
            return ResponseEntity.badRequest().body(ApiResponse.<InquiryDto>builder()
                    .success(false)
                    .message("문의 조회에 실패했습니다: " + e.getMessage())
                    .build());
        }
    }

    @GetMapping("/types")
    @Operation(summary = "문의 유형 목록", description = "문의 유형 목록을 조회합니다.")
    public ResponseEntity<ApiResponse<List<InquiryDto>>> getInquiryTypes() {
        try {
            List<InquiryDto> types = inquiryService.getInquiryTypes();
            
            return ResponseEntity.ok(ApiResponse.<List<InquiryDto>>builder()
                    .success(true)
                    .message("문의 유형 목록을 성공적으로 조회했습니다.")
                    .data(types)
                    .build());
        } catch (Exception e) {
            log.error("문의 유형 목록 조회 중 오류 발생: ", e);
            return ResponseEntity.badRequest().body(ApiResponse.<List<InquiryDto>>builder()
                    .success(false)
                    .message("문의 유형 목록 조회에 실패했습니다: " + e.getMessage())
                    .build());
        }
    }

    @GetMapping("/statuses")
    @Operation(summary = "문의 상태 목록", description = "문의 상태 목록을 조회합니다.")
    public ResponseEntity<ApiResponse<List<InquiryDto>>> getInquiryStatuses() {
        try {
            List<InquiryDto> statuses = inquiryService.getInquiryStatuses();
            
            return ResponseEntity.ok(ApiResponse.<List<InquiryDto>>builder()
                    .success(true)
                    .message("문의 상태 목록을 성공적으로 조회했습니다.")
                    .data(statuses)
                    .build());
        } catch (Exception e) {
            log.error("문의 상태 목록 조회 중 오류 발생: ", e);
            return ResponseEntity.badRequest().body(ApiResponse.<List<InquiryDto>>builder()
                    .success(false)
                    .message("문의 상태 목록 조회에 실패했습니다: " + e.getMessage())
                    .build());
        }
    }

    // 관리자용 API
    @GetMapping("/admin")
    @Operation(summary = "관리자 - 모든 문의 조회", description = "모든 문의를 조회합니다. (관리자 전용)")
    public ResponseEntity<ApiResponse<Page<InquiryDto>>> getAllInquiries(
            @RequestHeader("Authorization") String token,
            @Parameter(description = "문의 유형") @RequestParam(required = false) String type,
            @Parameter(description = "문의 상태") @RequestParam(required = false) String status,
            @Parameter(description = "페이지 번호 (0부터 시작)") @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "페이지 크기") @RequestParam(defaultValue = "10") int size) {
        try {
            String jwt = token.replace("Bearer ", "");
            Long userId = jwtTokenUtil.getUserIdFromToken(jwt);
            // TODO: 관리자 권한 확인 로직 추가
            
            Inquiry.Type typeEnum = type != null ? Inquiry.Type.valueOf(type.toUpperCase()) : null;
            Inquiry.Status statusEnum = status != null ? Inquiry.Status.valueOf(status.toUpperCase()) : null;
            
            Page<InquiryDto> inquiries = inquiryService.getAllInquiries(typeEnum, statusEnum, page, size);
            
            return ResponseEntity.ok(ApiResponse.<Page<InquiryDto>>builder()
                    .success(true)
                    .message("모든 문의를 성공적으로 조회했습니다.")
                    .data(inquiries)
                    .build());
        } catch (Exception e) {
            log.error("모든 문의 조회 중 오류 발생: ", e);
            return ResponseEntity.badRequest().body(ApiResponse.<Page<InquiryDto>>builder()
                    .success(false)
                    .message("모든 문의 조회에 실패했습니다: " + e.getMessage())
                    .build());
        }
    }

    @PutMapping("/admin/{id}")
    @Operation(summary = "관리자 - 문의 상태 업데이트", description = "문의 상태를 업데이트합니다. (관리자 전용)")
    public ResponseEntity<ApiResponse<InquiryDto>> updateInquiryStatus(
            @RequestHeader("Authorization") String token,
            @Parameter(description = "문의 ID") @PathVariable Long id,
            @RequestBody InquiryDto dto) {
        try {
            String jwt = token.replace("Bearer ", "");
            Long userId = jwtTokenUtil.getUserIdFromToken(jwt);
            // TODO: 관리자 권한 확인 로직 추가
            
            InquiryDto updatedInquiry = inquiryService.updateInquiryStatus(
                id, 
                Inquiry.Status.valueOf(dto.getStatus()), 
                dto.getAdminResponse(), 
                dto.getRespondedBy()
            );
            
            return ResponseEntity.ok(ApiResponse.<InquiryDto>builder()
                    .success(true)
                    .message("문의 상태를 성공적으로 업데이트했습니다.")
                    .data(updatedInquiry)
                    .build());
        } catch (Exception e) {
            log.error("문의 상태 업데이트 중 오류 발생: ", e);
            return ResponseEntity.badRequest().body(ApiResponse.<InquiryDto>builder()
                    .success(false)
                    .message("문의 상태 업데이트에 실패했습니다: " + e.getMessage())
                    .build());
        }
    }
} 