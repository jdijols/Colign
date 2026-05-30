-- =====================================================================
-- V3__seed_users.sql — demo users with manager / IC linkage.
--
-- Uses "INSERT INTO ... SELECT ... WHERE NOT EXISTS" instead of
-- ON CONFLICT (col) DO NOTHING because H2 in PostgreSQL-compat mode
-- doesn't implement the Postgres 9.5+ ON CONFLICT syntax. WHERE NOT
-- EXISTS works identically on both engines.
-- =====================================================================

SET search_path TO wc;

INSERT INTO app_user
    (email, display_name, role, team_id, is_active,
     created_by, created_date, version)
SELECT 'manager@st6.dev', 'Sam Manager', 'MANAGER',
       (SELECT id FROM team WHERE name = 'Engineering'),
       TRUE, 'system', CURRENT_TIMESTAMP, 0
WHERE NOT EXISTS (SELECT 1 FROM app_user WHERE email = 'manager@st6.dev');

INSERT INTO app_user
    (email, display_name, role, manager_id, team_id, is_active,
     created_by, created_date, version)
SELECT 'ada@st6.dev', 'Ada Lovelace', 'IC',
       (SELECT id FROM app_user WHERE email = 'manager@st6.dev'),
       (SELECT id FROM team WHERE name = 'Engineering'),
       TRUE, 'system', CURRENT_TIMESTAMP, 0
WHERE NOT EXISTS (SELECT 1 FROM app_user WHERE email = 'ada@st6.dev');

INSERT INTO app_user
    (email, display_name, role, manager_id, team_id, is_active,
     created_by, created_date, version)
SELECT 'ben@st6.dev', 'Ben Solo', 'IC',
       (SELECT id FROM app_user WHERE email = 'manager@st6.dev'),
       (SELECT id FROM team WHERE name = 'Engineering'),
       TRUE, 'system', CURRENT_TIMESTAMP, 0
WHERE NOT EXISTS (SELECT 1 FROM app_user WHERE email = 'ben@st6.dev');

INSERT INTO app_user
    (email, display_name, role, manager_id, team_id, is_active,
     created_by, created_date, version)
SELECT 'chris@st6.dev', 'Chris Park', 'IC',
       (SELECT id FROM app_user WHERE email = 'manager@st6.dev'),
       (SELECT id FROM team WHERE name = 'Engineering'),
       TRUE, 'system', CURRENT_TIMESTAMP, 0
WHERE NOT EXISTS (SELECT 1 FROM app_user WHERE email = 'chris@st6.dev');

INSERT INTO app_user
    (email, display_name, role, is_active,
     created_by, created_date, version)
SELECT 'admin@st6.dev', 'Admin', 'ADMIN',
       TRUE, 'system', CURRENT_TIMESTAMP, 0
WHERE NOT EXISTS (SELECT 1 FROM app_user WHERE email = 'admin@st6.dev');
