package com.at_a_look.economy.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.at_a_look.economy.dto.response.ApiResponse;

@RestController
@RequestMapping("/api")
public class HealthCheckController {
    
    @GetMapping("/health")
    public ApiResponse<String> healthCheck() {
        return ApiResponse.success("서버가 정상적으로 동작하고 있습니다.");
    }
    
    @GetMapping("/")
    public String rootHealthCheck() {
        return "Server is running!";
    }
}