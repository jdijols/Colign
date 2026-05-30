package com.wc.config.exception;

import com.wc.domain.PlanState;

public class IllegalTransitionException extends RuntimeException {
    public IllegalTransitionException(PlanState from, PlanState to, String reason) {
        super("Illegal plan transition " + from + " -> " + to + (reason == null ? "" : ": " + reason));
    }
}
