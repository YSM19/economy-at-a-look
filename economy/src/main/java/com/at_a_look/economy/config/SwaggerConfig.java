package com.at_a_look.economy.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

@Configuration
@Profile("!prod")
public class SwaggerConfig {

    @Bean
    public OpenAPI openAPI() {
        final String bearerName = "bearerAuth";
        return new OpenAPI()
                .components(new Components()
                        .addSecuritySchemes(bearerName, new SecurityScheme()
                                .type(SecurityScheme.Type.HTTP)
                                .scheme("bearer")
                                .bearerFormat("JWT")))
                .addSecurityItem(new SecurityRequirement().addList(bearerName))
                .info(new Info()
                        .title("이코노뷰 API")
                        .description("환율, 금리, 물가지수 등의 경제 지표를 제공하는 API입니다.")
                        .version("v1.0.1")
                        .contact(new Contact()
                                .name("Economy At A Look")
                                .email("example@example.com"))
                        .license(new License()
                                .name("Apache 2.0")
                                .url("https://www.apache.org/licenses/LICENSE-2.0")));
    }
}