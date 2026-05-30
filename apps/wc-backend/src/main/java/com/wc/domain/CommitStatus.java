package com.wc.domain;

/**
 * Lifecycle of a single weekly commit row.
 * PLANNED while the plan is DRAFT or LOCKED.
 * DONE / MISSED / CARRIED are terminal states set during reconciliation.
 */
public enum CommitStatus {
    PLANNED,
    IN_PROGRESS,
    DONE,
    MISSED,
    CARRIED
}
