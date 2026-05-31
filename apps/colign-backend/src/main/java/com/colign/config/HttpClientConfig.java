package com.colign.config;

import java.time.Duration;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;

/**
 * Application-wide outbound HTTP client. Spring Boot 3 auto-configures
 * {@link RestTemplateBuilder} but not a {@link RestTemplate} bean — we need
 * one for Resend with sensible timeouts so a slow provider can't tie up
 * request threads.
 */
@Configuration
public class HttpClientConfig {

    @Bean
    RestTemplate restTemplate(RestTemplateBuilder builder) {
        return builder
                .setConnectTimeout(Duration.ofSeconds(5))
                .setReadTimeout(Duration.ofSeconds(10))
                .build();
    }
}
