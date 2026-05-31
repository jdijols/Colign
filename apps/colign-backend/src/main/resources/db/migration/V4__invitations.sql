-- =====================================================================
-- V4__invitations.sql — team invitations
--
-- One row per outbound invitation. Token is unique (it's literally in the
-- URL of the email) and is the only field exposed past the API edge.
-- Email is lowercased on write so the accept-time equality check stays
-- case-insensitive without per-query LOWER(). Status is denormalised so
-- expiry sweeps and "still pending?" checks don't need to recompute.
-- =====================================================================

SET search_path TO wc;

CREATE TABLE invitation (
    id                  BIGSERIAL PRIMARY KEY,
    email               VARCHAR(254) NOT NULL,
    team_id             BIGINT NOT NULL REFERENCES team(id) ON DELETE CASCADE,
    inviter_user_id     BIGINT NOT NULL REFERENCES app_user(id),
    relationship        VARCHAR(16)  NOT NULL,   -- REPORT | PEER
    token               VARCHAR(64)  NOT NULL UNIQUE,
    expires_at          TIMESTAMP    NOT NULL,
    accepted_at         TIMESTAMP,
    status              VARCHAR(16)  NOT NULL DEFAULT 'PENDING',
        -- PENDING | ACCEPTED | EXPIRED | REVOKED
    created_by          VARCHAR(50)  NOT NULL,
    created_date        TIMESTAMP    NOT NULL,
    last_modified_by    VARCHAR(50),
    last_modified_date  TIMESTAMP,
    version             INT NOT NULL DEFAULT 0
);

-- Lookups for "is there an open invite for this email on my team?" and
-- "show me everyone we've invited" — both unsorted scans on production
-- tenants without these.
CREATE INDEX ix_invitation_email      ON invitation(email);
CREATE INDEX ix_invitation_team       ON invitation(team_id);
CREATE INDEX ix_invitation_status     ON invitation(status);
