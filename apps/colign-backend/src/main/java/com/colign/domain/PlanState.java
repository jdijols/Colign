package com.colign.domain;

/**
 * Plan lifecycle states. See PLAN.md §4 for the state machine. Allowed transitions are enforced in
 * the service layer, not here.
 */
public enum PlanState {
  DRAFT,
  LOCKED,
  RECONCILING,
  RECONCILED,
  CARRIED_FORWARD
}
