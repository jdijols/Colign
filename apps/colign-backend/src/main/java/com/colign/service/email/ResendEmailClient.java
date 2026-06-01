package com.colign.service.email;

import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Primary;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

/**
 * Sends transactional emails via Resend's HTTP API (https://resend.com/docs).
 *
 * <p>Why this and not Spring's {@code JavaMailSender}: Resend is the chosen provider for v1 (single
 * HTTP POST, no SMTP infrastructure, free dev tier with the {@code onboarding@resend.dev} sandbox
 * sender). Adding the Resend Java SDK would pull in OkHttp + Moshi; {@link RestTemplate} is already
 * on the classpath via {@code spring-boot-starter-web} and the request is one POST.
 *
 * <p>When {@code colign.email.resend-api-key} is blank — typical for local dev without Resend
 * configured — we log the would-be email at INFO and return silently. This keeps the invitation
 * flow working end-to-end in mock mode (and during tests) without requiring an API key in every
 * contributor's environment.
 */
@Component
@Primary
public class ResendEmailClient implements EmailClient {

  private static final Logger LOG = LoggerFactory.getLogger(ResendEmailClient.class);
  private static final String ENDPOINT = "https://api.resend.com/emails";

  private final RestTemplate http;
  private final String apiKey;
  private final String fromAddress;

  public ResendEmailClient(
      RestTemplate restTemplate,
      @Value("${colign.email.resend-api-key:}") String apiKey,
      @Value("${colign.email.from:Colign <onboarding@resend.dev>}") String fromAddress) {
    this.http = restTemplate;
    this.apiKey = apiKey;
    this.fromAddress = fromAddress;
  }

  @Override
  public void sendInvitation(InvitationEmail email) {
    String subject =
        "%s invited you to Colign — %s".formatted(email.inviterDisplayName(), email.teamName());
    String html = renderHtml(email);

    if (apiKey == null || apiKey.isBlank()) {
      LOG.info(
          "[email:disabled] would send invitation to {} | subject={} | acceptUrl={}",
          email.toEmail(),
          subject,
          email.acceptUrl());
      return;
    }

    HttpHeaders headers = new HttpHeaders();
    headers.setContentType(MediaType.APPLICATION_JSON);
    headers.setBearerAuth(apiKey);

    Map<String, Object> body =
        Map.of(
            "from", fromAddress,
            "to", List.of(email.toEmail()),
            "subject", subject,
            "html", html);

    try {
      http.exchange(ENDPOINT, HttpMethod.POST, new HttpEntity<>(body, headers), String.class);
    } catch (RestClientException ex) {
      // Surface as a 502 to the caller via the controller — silent
      // swallow would leave the invitation row pending with no email.
      throw new EmailDeliveryException(
          "Resend rejected the invitation email to " + email.toEmail(), ex);
    }
  }

  private String renderHtml(InvitationEmail email) {
    String relationshipLabel =
        switch (email.relationship()) {
          case REPORT -> "as a direct report";
          case PEER -> "as a teammate";
        };
    // Plain inline HTML — no images, no tracking pixels, single CTA.
    return """
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; \
                color: #171717; max-width: 480px; margin: 0 auto; padding: 24px;">
                  <h1 style="font-size: 20px; font-weight: 600; margin: 0 0 16px;">You're invited to Colign</h1>
                  <p style="font-size: 14px; line-height: 1.6; margin: 0 0 12px;">
                    <strong>%s</strong> invited you to join <strong>%s</strong> %s.
                  </p>
                  <p style="font-size: 14px; line-height: 1.6; margin: 0 0 24px; color: #525252;">
                    Colign turns weekly commits into strategic alignment. One click below to accept.
                  </p>
                  <a href="%s" style="display: inline-block; background: #171717; color: #fafafa; \
                text-decoration: none; padding: 10px 18px; border-radius: 8px; font-size: 14px; font-weight: 500;">
                    Accept invitation
                  </a>
                  <p style="font-size: 12px; line-height: 1.6; margin: 24px 0 0; color: #737373;">
                    Or paste this link in your browser:<br/>
                    <span style="font-family: ui-monospace, SFMono-Regular, Menlo, monospace;">%s</span>
                  </p>
                </div>
                """
        .formatted(
            escapeHtml(email.inviterDisplayName()),
            escapeHtml(email.teamName()),
            relationshipLabel,
            email.acceptUrl(),
            email.acceptUrl());
  }

  private static String escapeHtml(String s) {
    if (s == null) return "";
    return s.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace("\"", "&quot;");
  }
}
