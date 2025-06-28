package com.at_a_look.economy;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HealthCheckController {

    @GetMapping("/") // 루트 경로("/")로 오는 모든 요청을 이 메소드가 받습니다.
    public String healthCheck() {
        return "OK, It's working! The request successfully reached the Spring Boot application!";
    }
}