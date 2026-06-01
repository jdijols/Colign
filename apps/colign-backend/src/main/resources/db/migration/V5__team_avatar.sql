-- =====================================================================
-- V5__team_avatar.sql — adds team.avatar_url
--
-- Provisions the column ahead of the avatar UI in Phase 4 so TeamService
-- can use the direct getter/setter without a reflection bridge.
-- Backwards-compatible: existing rows get NULL. FE falls back to a generated
-- initial when null. No backfill needed.
-- =====================================================================

SET search_path TO wc;

ALTER TABLE team ADD COLUMN avatar_url VARCHAR(500);
