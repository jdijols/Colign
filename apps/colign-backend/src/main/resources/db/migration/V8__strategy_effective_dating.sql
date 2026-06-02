-- =====================================================================
-- V8__strategy_effective_dating.sql — temporal validity for the RCDO chain
--
-- The timeline views (Goals tab) render the strategy "as of" any week: an
-- element is established at created_date and stays visible until it is retired.
-- This adds a nullable effective_to to the editable strategy nodes:
--   NULL       = still active
--   <timestamp>= the moment it was retired (soft delete)
--
-- Removing an objective or outcome now stamps effective_to instead of deleting
-- the row, so scrubbing to a past week still shows what was in place then, and
-- scrubbing past the retirement week drops it. rally_cry gets its column when
-- the pivot flow lands (a later migration), so it is intentionally omitted here.
-- =====================================================================

SET search_path TO wc;

ALTER TABLE defining_objective ADD COLUMN effective_to TIMESTAMP;
ALTER TABLE outcome            ADD COLUMN effective_to TIMESTAMP;
