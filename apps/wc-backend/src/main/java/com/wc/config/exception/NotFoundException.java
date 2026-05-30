package com.wc.config.exception;

public class NotFoundException extends RuntimeException {
    public NotFoundException(String message) {
        super(message);
    }

    public static NotFoundException of(String entityName, Object id) {
        return new NotFoundException(entityName + " not found: " + id);
    }
}
