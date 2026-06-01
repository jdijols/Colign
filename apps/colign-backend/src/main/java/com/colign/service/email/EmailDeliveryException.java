package com.colign.service.email;

/**
 * Thrown when an outbound email provider rejects a send. Mapped to 502 by {@link
 * com.colign.config.exception.GlobalExceptionHandler} so the client can distinguish "we couldn't
 * reach Resend" from "your request was bad".
 */
public class EmailDeliveryException extends RuntimeException {
  public EmailDeliveryException(String message, Throwable cause) {
    super(message, cause);
  }
}
