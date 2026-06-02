-- =====================================================================
-- V9__rally_cry_effective_dating.sql — effective_to on rally_cry
--
-- V8 added effective_to to defining_objective + outcome. Pivoting the Rally
-- Cry (archive the current one, start a new one) needs the same soft-delete
-- column on rally_cry so past weeks still show the Rally Cry that was live then.
-- NULL = active; a timestamp = retired.
-- =====================================================================

SET search_path TO wc;

ALTER TABLE rally_cry ADD COLUMN effective_to TIMESTAMP;
