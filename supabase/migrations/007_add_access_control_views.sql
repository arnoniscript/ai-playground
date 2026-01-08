-- Migration 007: Add access control views
-- This migration creates views that use the 'client' enum value
-- It must be run after migration 006 and in a separate transaction
-- because PostgreSQL doesn't allow using new enum values in the same transaction

-- ============================================================
-- 1. Add helpful views
-- ============================================================

-- Drop views if they exist to recreate them
DROP VIEW IF EXISTS playground_access_list;
DROP VIEW IF EXISTS user_playground_access;

-- View to see all users authorized for each playground
CREATE VIEW playground_access_list AS
SELECT 
  p.id as playground_id,
  p.name as playground_name,
  p.access_control_type,
  pau.user_id,
  u.email as user_email,
  u.full_name as user_name,
  u.role as user_role,
  pau.authorized_at,
  authorizer.email as authorized_by_email
FROM playgrounds p
LEFT JOIN playground_authorized_users pau ON p.id = pau.playground_id
LEFT JOIN users u ON pau.user_id = u.id
LEFT JOIN users authorizer ON pau.authorized_by = authorizer.id;

-- View to see all playgrounds a user can access
CREATE VIEW user_playground_access AS
SELECT 
  u.id as user_id,
  u.email,
  u.role,
  p.id as playground_id,
  p.name as playground_name,
  p.access_control_type,
  CASE 
    WHEN u.role = 'admin' THEN true
    WHEN u.role = 'client' THEN (pau.user_id IS NOT NULL)
    WHEN u.role = 'tester' THEN (
      p.access_control_type = 'open' OR
      (p.access_control_type = 'email_restricted' AND u.email = ANY(p.restricted_emails))
    )
    ELSE false
  END as has_access
FROM users u
CROSS JOIN playgrounds p
LEFT JOIN playground_authorized_users pau 
  ON p.id = pau.playground_id AND u.id = pau.user_id;

-- ============================================================
-- 2. Comments for documentation
-- ============================================================

COMMENT ON VIEW playground_access_list IS 
  'Shows all users authorized for each playground';

COMMENT ON VIEW user_playground_access IS 
  'Shows all playgrounds each user can access based on their role and authorizations';
