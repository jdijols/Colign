-- V6: Add POSITIONING as a fourth chess tag.
--
-- The chess layer prior to this migration enumerated three postures —
-- OFFENSE / DEFENSE / MAINTENANCE — seeded by V1__init.sql. Positioning
-- describes preparatory work that sets up future Offense/Defense without
-- being immediately attacking or guarding (e.g., laying infrastructure
-- ahead of a campaign, hiring before a push, building optionality).
--
-- priority_rank=4 puts Positioning after Maintenance for now. This is the
-- conservative default; the rank may be tuned in a follow-up once usage
-- patterns are observable (see docs/product-strategy-onboarding-plan.md
-- Deferred / Open Questions — "Positioning chess type as 4th move type").

INSERT INTO chess_tag (code, label, priority_rank) VALUES
    ('POSITIONING', 'Positioning', 4);
