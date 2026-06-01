-- =====================================================================
-- V7__strategy_team_scope.sql — denormalise team_id onto the RCDO chain
--
-- Strategy onboarding (docs/product-strategy-onboarding-plan.md) introduces
-- team-scoped write endpoints for Rally Cry → Defining Objective → Outcome.
-- Authorization is `requireSameTeam(caller, target.teamId) && role IN
-- (MANAGER, ADMIN)` and read endpoints filter by `caller.teamId`. Both need a
-- direct team_id on every node rather than walking the FK chain per request, so
-- this migration denormalises team_id onto defining_objective and outcome and
-- backfills it from their parents:
--   defining_objective.team_id ← rally_cry.team_id
--   outcome.team_id            ← defining_objective.team_id
--
-- rally_cry already carries team_id (V1). The columns land nullable, are
-- backfilled, then tightened to NOT NULL + FK so existing seed rows survive.
--
-- NOTE ON VERSION NUMBERING: V6 is reserved by the "Submit-rename + Positioning"
-- PR (#11), which adds the POSITIONING chess_tag row. This slice is branched off
-- main independently and intentionally skips to V7 to avoid a duplicate-version
-- collision when both PRs land in slice order (#11 before this one).
-- =====================================================================

SET search_path TO wc;

-- --- defining_objective.team_id -------------------------------------------
ALTER TABLE defining_objective ADD COLUMN team_id BIGINT;

UPDATE defining_objective d
   SET team_id = (SELECT rc.team_id FROM rally_cry rc WHERE rc.id = d.rally_cry_id);

ALTER TABLE defining_objective ALTER COLUMN team_id SET NOT NULL;
ALTER TABLE defining_objective
    ADD CONSTRAINT fk_def_obj_team FOREIGN KEY (team_id) REFERENCES team(id);
CREATE INDEX ix_def_obj_team ON defining_objective(team_id);

-- --- outcome.team_id ------------------------------------------------------
ALTER TABLE outcome ADD COLUMN team_id BIGINT;

UPDATE outcome o
   SET team_id = (SELECT d.team_id FROM defining_objective d WHERE d.id = o.defining_objective_id);

ALTER TABLE outcome ALTER COLUMN team_id SET NOT NULL;
ALTER TABLE outcome
    ADD CONSTRAINT fk_outcome_team FOREIGN KEY (team_id) REFERENCES team(id);
CREATE INDEX ix_outcome_team ON outcome(team_id);
