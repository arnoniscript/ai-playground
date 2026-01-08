-- Migration 006: Add client role and playground authorization system
-- This migration adds the 'client' user role and creates a system for
-- explicitly authorizing users to access specific playgrounds

-- ============================================================
-- 1. Add 'client' to user_role enum
-- ============================================================

-- Add 'client' value to existing enum (PostgreSQL 9.1+)
-- This is safer than dropping and recreating the enum
DO $$ 
BEGIN
  -- Check if 'client' already exists in the enum
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'client' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')
  ) THEN
    -- Add 'client' to the enum
    ALTER TYPE user_role ADD VALUE 'client';
  END IF;
END $$;

-- ============================================================
-- 2. Create playground_authorized_users table
-- ============================================================

-- This table explicitly links users to playgrounds they can access
-- Clients can ONLY access playgrounds they're authorized for
-- Other roles (admin, tester) continue using the existing restricted_emails logic

CREATE TABLE IF NOT EXISTS playground_authorized_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playground_id UUID NOT NULL REFERENCES playgrounds(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  authorized_by UUID REFERENCES users(id) ON DELETE SET NULL, -- Who granted access
  authorized_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  notes TEXT, -- Optional notes about why this user was authorized
  UNIQUE(playground_id, user_id)
);

-- Index for faster lookups
CREATE INDEX idx_playground_authorized_users_playground_id 
  ON playground_authorized_users(playground_id);

CREATE INDEX idx_playground_authorized_users_user_id 
  ON playground_authorized_users(user_id);

-- ============================================================
-- 3. Add access_control_type to playgrounds table
-- ============================================================

-- Add column to distinguish between different access control modes:
-- 'open' - All authenticated users can access (if restricted_emails is NULL)
-- 'email_restricted' - Only users with emails in restricted_emails array
-- 'explicit_authorization' - Only users in playground_authorized_users

DO $$ 
BEGIN
  -- Check if column doesn't exist before adding
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'playgrounds' 
    AND column_name = 'access_control_type'
  ) THEN
    ALTER TABLE playgrounds
    ADD COLUMN access_control_type VARCHAR(50) DEFAULT 'open'
      CHECK (access_control_type IN ('open', 'email_restricted', 'explicit_authorization'));
    
    -- Set existing playgrounds with restricted_emails to 'email_restricted'
    UPDATE playgrounds
    SET access_control_type = 'email_restricted'
    WHERE restricted_emails IS NOT NULL AND array_length(restricted_emails, 1) > 0;
  END IF;
END $$;

-- ============================================================
-- 4. Row Level Security Policies
-- ============================================================

-- Enable RLS on the new table
ALTER TABLE playground_authorized_users ENABLE ROW LEVEL SECURITY;

-- Admins can see all authorizations
CREATE POLICY "Admins can view all authorizations" ON playground_authorized_users
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid()::uuid 
      AND users.role = 'admin'
    )
  );

-- Admins can insert authorizations
CREATE POLICY "Admins can insert authorizations" ON playground_authorized_users
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid()::uuid 
      AND users.role = 'admin'
    )
  );

-- Admins can delete authorizations
CREATE POLICY "Admins can delete authorizations" ON playground_authorized_users
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid()::uuid 
      AND users.role = 'admin'
    )
  );

-- Users can view their own authorizations
CREATE POLICY "Users can view their own authorizations" ON playground_authorized_users
  FOR SELECT
  USING (user_id = auth.uid()::uuid);

-- ============================================================
-- 5. Update existing policies (if needed)
-- ============================================================

-- Note: The main access control logic will be implemented in the backend
-- These RLS policies are secondary protection

-- ============================================================
-- 6. Comments for documentation
-- ============================================================

COMMENT ON TABLE playground_authorized_users IS 
  'Explicit authorization table for users (especially clients) to access specific playgrounds';

COMMENT ON COLUMN playgrounds.access_control_type IS 
  'Access control mode: open (all users), email_restricted (restricted_emails array), explicit_authorization (playground_authorized_users table)';

-- Note: Views that use the 'client' enum value will be created in migration 007
-- This is necessary because PostgreSQL doesn't allow using new enum values
-- in the same transaction where they are created.
