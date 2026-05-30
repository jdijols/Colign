-- =====================================================================
-- V2__demo_seed.sql — demo seed for the IC plan flow.
-- 1 Team, 1 RallyCry, 2 DefiningObjectives, 5 Outcomes (P0/P1/P2 mix).
-- Users are lazy-provisioned from JWT on first hit (UserResolver) so
-- we deliberately don't seed them here.
-- =====================================================================

SET search_path TO wc;

INSERT INTO team (name, description, created_by, created_date)
VALUES ('Engineering', 'Engineering org — ICs, EMs, and platform.',
        'system', CURRENT_TIMESTAMP);

INSERT INTO rally_cry
    (title, narrative, team_id, horizon_start, horizon_end, status,
     created_by, created_date)
VALUES (
    'Ship faster, support stronger',
    'Reduce time-to-value while keeping retention high through 2026.',
    (SELECT id FROM team WHERE name = 'Engineering'),
    DATE '2026-01-01', DATE '2026-12-31', 'ACTIVE',
    'system', CURRENT_TIMESTAMP);

INSERT INTO defining_objective
    (rally_cry_id, title, description, status, created_by, created_date)
VALUES
    ((SELECT id FROM rally_cry WHERE title = 'Ship faster, support stronger'),
     'Reduce p50 onboarding time to under 1 day',
     'Net new customers should reach first value within 24 hours of signup.',
     'ACTIVE', 'system', CURRENT_TIMESTAMP),
    ((SELECT id FROM rally_cry WHERE title = 'Ship faster, support stronger'),
     'Cut p95 API latency to 200ms',
     'Across the auth, plan, and reconcile endpoints.',
     'ACTIVE', 'system', CURRENT_TIMESTAMP);

INSERT INTO outcome
    (defining_objective_id, parent_outcome_id, title, description,
     metric_type, target_value, baseline_value, current_value,
     priority_tier, status, created_by, created_date)
VALUES
    ((SELECT id FROM defining_objective
        WHERE title = 'Reduce p50 onboarding time to under 1 day'),
     NULL,
     'Onboarding wizard conversion ≥ 80%',
     '8 of 10 new accounts complete the wizard within 30 minutes.',
     'PERCENT', 80.0, 55.0, 62.0,
     'P0', 'ACTIVE', 'system', CURRENT_TIMESTAMP),

    ((SELECT id FROM defining_objective
        WHERE title = 'Reduce p50 onboarding time to under 1 day'),
     NULL,
     'First-week active rate ≥ 70%',
     'New users return at least 3 days in their first week.',
     'PERCENT', 70.0, 45.0, 51.0,
     'P1', 'ACTIVE', 'system', CURRENT_TIMESTAMP),

    ((SELECT id FROM defining_objective
        WHERE title = 'Cut p95 API latency to 200ms'),
     NULL,
     'Auth endpoint p95 ≤ 200ms',
     'JWT validation + introspection round-trip on /plans/current.',
     'NUMBER', 200, 380, 240,
     'P0', 'ACTIVE', 'system', CURRENT_TIMESTAMP),

    ((SELECT id FROM defining_objective
        WHERE title = 'Cut p95 API latency to 200ms'),
     NULL,
     'Plans-list endpoint p95 ≤ 200ms',
     'With Pageable + EntityGraph hydration to avoid N+1.',
     'NUMBER', 200, 450, 310,
     'P1', 'ACTIVE', 'system', CURRENT_TIMESTAMP),

    ((SELECT id FROM defining_objective
        WHERE title = 'Cut p95 API latency to 200ms'),
     NULL,
     'Reduce auth cache miss rate',
     'In support of the p95 target above.',
     'PERCENT', 10.0, 35.0, 28.0,
     'P2', 'ACTIVE', 'system', CURRENT_TIMESTAMP);
