-- =====================================================================
-- V1__init.sql — Weekly Commit Module core schema
--
-- Tables created (in FK-safe order):
--   chess_tag (lookup)
--   app_user
--   team
--   rally_cry
--   defining_objective
--   outcome  (self-FK for Supporting Outcomes)
--   plan
--   weekly_commit
--   reconciliation
--
-- Every domain table carries JHipster-style audit columns
-- (created_by, created_date, last_modified_by, last_modified_date, version)
-- populated by AbstractAuditingEntity + AuditingEntityListener.
-- =====================================================================

CREATE SCHEMA IF NOT EXISTS wc;
SET search_path TO wc;

-- =========================
-- Lookup: chess_tag
-- =========================
CREATE TABLE chess_tag (
    id                  BIGSERIAL PRIMARY KEY,
    code                VARCHAR(32) NOT NULL UNIQUE,
    label               VARCHAR(64) NOT NULL,
    priority_rank       INT NOT NULL DEFAULT 100,
    created_by          VARCHAR(50) NOT NULL DEFAULT 'system',
    created_date        TIMESTAMP   NOT NULL DEFAULT NOW(),
    last_modified_by    VARCHAR(50),
    last_modified_date  TIMESTAMP,
    version             INT NOT NULL DEFAULT 0
);

INSERT INTO chess_tag (code, label, priority_rank) VALUES
    ('OFFENSE',     'Offense',     1),
    ('DEFENSE',     'Defense',     2),
    ('MAINTENANCE', 'Maintenance', 3);

-- =========================
-- app_user (User is reserved in PG)
-- =========================
CREATE TABLE app_user (
    id                  BIGSERIAL PRIMARY KEY,
    email               VARCHAR(254) NOT NULL UNIQUE,
    display_name        VARCHAR(120) NOT NULL,
    avatar_url          VARCHAR(500),
    role                VARCHAR(20)  NOT NULL DEFAULT 'IC',  -- IC | MANAGER | ADMIN
    manager_id          BIGINT REFERENCES app_user(id),
    team_id             BIGINT,
    auth0_sub           VARCHAR(120) UNIQUE,
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    created_by          VARCHAR(50) NOT NULL,
    created_date        TIMESTAMP   NOT NULL,
    last_modified_by    VARCHAR(50),
    last_modified_date  TIMESTAMP,
    version             INT NOT NULL DEFAULT 0
);
CREATE INDEX ix_app_user_manager ON app_user(manager_id);
CREATE INDEX ix_app_user_team ON app_user(team_id);

-- =========================
-- team
-- =========================
CREATE TABLE team (
    id                  BIGSERIAL PRIMARY KEY,
    name                VARCHAR(120) NOT NULL,
    description         TEXT,
    lead_user_id        BIGINT REFERENCES app_user(id),
    created_by          VARCHAR(50) NOT NULL,
    created_date        TIMESTAMP   NOT NULL,
    last_modified_by    VARCHAR(50),
    last_modified_date  TIMESTAMP,
    version             INT NOT NULL DEFAULT 0
);

ALTER TABLE app_user
    ADD CONSTRAINT fk_app_user_team FOREIGN KEY (team_id) REFERENCES team(id);

-- =========================
-- rally_cry (top of RCDO hierarchy)
-- =========================
CREATE TABLE rally_cry (
    id                  BIGSERIAL PRIMARY KEY,
    title               VARCHAR(200) NOT NULL,
    narrative           TEXT,
    team_id             BIGINT NOT NULL REFERENCES team(id),
    horizon_start       DATE NOT NULL,
    horizon_end         DATE NOT NULL,
    status              VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',  -- DRAFT | ACTIVE | ARCHIVED
    created_by          VARCHAR(50) NOT NULL,
    created_date        TIMESTAMP   NOT NULL,
    last_modified_by    VARCHAR(50),
    last_modified_date  TIMESTAMP,
    version             INT NOT NULL DEFAULT 0,
    CONSTRAINT ck_rally_cry_horizon CHECK (horizon_end >= horizon_start)
);
CREATE INDEX ix_rally_cry_team ON rally_cry(team_id);

-- =========================
-- defining_objective (Objective layer, scoped to a Rally Cry)
-- =========================
CREATE TABLE defining_objective (
    id                  BIGSERIAL PRIMARY KEY,
    rally_cry_id        BIGINT NOT NULL REFERENCES rally_cry(id) ON DELETE CASCADE,
    title               VARCHAR(200) NOT NULL,
    description         TEXT,
    owner_user_id       BIGINT REFERENCES app_user(id),
    status              VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_by          VARCHAR(50) NOT NULL,
    created_date        TIMESTAMP   NOT NULL,
    last_modified_by    VARCHAR(50),
    last_modified_date  TIMESTAMP,
    version             INT NOT NULL DEFAULT 0
);
CREATE INDEX ix_def_obj_rc ON defining_objective(rally_cry_id);

-- =========================
-- outcome (KR layer + self-FK for Supporting Outcomes)
-- =========================
CREATE TABLE outcome (
    id                      BIGSERIAL PRIMARY KEY,
    defining_objective_id   BIGINT NOT NULL REFERENCES defining_objective(id) ON DELETE CASCADE,
    parent_outcome_id       BIGINT REFERENCES outcome(id) ON DELETE CASCADE,
    title                   VARCHAR(200) NOT NULL,
    description             TEXT,
    metric_type             VARCHAR(20) NOT NULL DEFAULT 'NUMBER',  -- NUMBER | PERCENT | CURRENCY | BOOLEAN
    target_value            NUMERIC(18,4),
    baseline_value          NUMERIC(18,4),
    current_value           NUMERIC(18,4),
    priority_tier           VARCHAR(8) NOT NULL DEFAULT 'P1',       -- P0 | P1 | P2 | P3
    status                  VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_by              VARCHAR(50) NOT NULL,
    created_date            TIMESTAMP   NOT NULL,
    last_modified_by        VARCHAR(50),
    last_modified_date      TIMESTAMP,
    version                 INT NOT NULL DEFAULT 0
);
CREATE INDEX ix_outcome_def_obj ON outcome(defining_objective_id);
CREATE INDEX ix_outcome_parent  ON outcome(parent_outcome_id);
CREATE INDEX ix_outcome_priority ON outcome(priority_tier);

-- =========================
-- plan (one per user per week — the lifecycle container)
-- =========================
CREATE TABLE plan (
    id                  BIGSERIAL PRIMARY KEY,
    user_id             BIGINT NOT NULL REFERENCES app_user(id),
    week_start_date     DATE NOT NULL,
    state               VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
        -- DRAFT | LOCKED | RECONCILING | RECONCILED | CARRIED_FORWARD
    locked_at           TIMESTAMP,
    reconciled_at       TIMESTAMP,
    manager_signed_at   TIMESTAMP,
    manager_signed_by   BIGINT REFERENCES app_user(id),
    created_by          VARCHAR(50) NOT NULL,
    created_date        TIMESTAMP   NOT NULL,
    last_modified_by    VARCHAR(50),
    last_modified_date  TIMESTAMP,
    version             INT NOT NULL DEFAULT 0,
    CONSTRAINT uk_plan_user_week UNIQUE (user_id, week_start_date)
);
CREATE INDEX ix_plan_state ON plan(state);
CREATE INDEX ix_plan_user_week ON plan(user_id, week_start_date DESC);

-- =========================
-- weekly_commit (the IC's commitment, FK to Outcome leaf)
-- =========================
CREATE TABLE weekly_commit (
    id                      BIGSERIAL PRIMARY KEY,
    plan_id                 BIGINT NOT NULL REFERENCES plan(id) ON DELETE CASCADE,
    outcome_id              BIGINT NOT NULL REFERENCES outcome(id),  -- STRUCTURAL ALIGNMENT GUARANTEE
    chess_tag_id            BIGINT REFERENCES chess_tag(id),
    title                   VARCHAR(200) NOT NULL,
    description             TEXT,
    planned_effort_hours    NUMERIC(5,2),
    status                  VARCHAR(20) NOT NULL DEFAULT 'PLANNED',
        -- PLANNED | IN_PROGRESS | DONE | MISSED | CARRIED
    ordinal                 INT NOT NULL DEFAULT 0,
    carried_from_commit_id  BIGINT REFERENCES weekly_commit(id),
    created_by              VARCHAR(50) NOT NULL,
    created_date            TIMESTAMP   NOT NULL,
    last_modified_by        VARCHAR(50),
    last_modified_date      TIMESTAMP,
    version                 INT NOT NULL DEFAULT 0
);
CREATE INDEX ix_wc_plan ON weekly_commit(plan_id);
CREATE INDEX ix_wc_outcome ON weekly_commit(outcome_id);
CREATE INDEX ix_wc_chess ON weekly_commit(chess_tag_id);
CREATE INDEX ix_wc_status ON weekly_commit(status);
CREATE INDEX ix_wc_carried ON weekly_commit(carried_from_commit_id);

-- =========================
-- reconciliation (1:0..1 with weekly_commit — preserves locked plan-of-record)
-- =========================
CREATE TABLE reconciliation (
    id                      BIGSERIAL PRIMARY KEY,
    weekly_commit_id        BIGINT NOT NULL UNIQUE REFERENCES weekly_commit(id) ON DELETE CASCADE,
    actual_status           VARCHAR(20) NOT NULL,
        -- DONE | PARTIAL | MISSED | DROPPED | ADDED
    actual_outcome_note     TEXT,
    actual_effort_hours     NUMERIC(5,2),
    outcome_delta           NUMERIC(18,4),
    reconciled_at           TIMESTAMP NOT NULL DEFAULT NOW(),
    reconciled_by           VARCHAR(50) NOT NULL,
    created_by              VARCHAR(50) NOT NULL,
    created_date            TIMESTAMP   NOT NULL,
    last_modified_by        VARCHAR(50),
    last_modified_date      TIMESTAMP,
    version                 INT NOT NULL DEFAULT 0
);
CREATE INDEX ix_recon_status ON reconciliation(actual_status);
