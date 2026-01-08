-- Migration 008: Add user management fields
-- This migration adds fields for user status tracking, invitations, and blocking

-- ============================================================
-- 1. Create user_status enum
-- ============================================================

DO $$ 
BEGIN
  -- Check if enum doesn't exist before creating
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_status') THEN
    CREATE TYPE user_status AS ENUM ('active', 'pending_invite', 'blocked');
  END IF;
END $$;

-- ============================================================
-- 2. Add status and management fields to users table
-- ============================================================

-- Add status column if it doesn't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS status user_status DEFAULT 'active';

-- Add invited_at column if it doesn't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS invited_at TIMESTAMP WITH TIME ZONE;

-- Add invited_by column if it doesn't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS invited_by UUID;

-- Add blocked_at column if it doesn't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS blocked_at TIMESTAMP WITH TIME ZONE;

-- Add blocked_by column if it doesn't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS blocked_by UUID;

-- Add blocked_reason column if it doesn't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS blocked_reason TEXT;

-- Add foreign key constraints separately (after columns exist)
DO $$ 
BEGIN
  -- Add foreign key for invited_by if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'users_invited_by_fkey'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_invited_by_fkey 
      FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE SET NULL;
  END IF;

  -- Add foreign key for blocked_by if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'users_blocked_by_fkey'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_blocked_by_fkey 
      FOREIGN KEY (blocked_by) REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================================
-- 3. Set all existing users to 'active' status
-- ============================================================

UPDATE users 
SET status = 'active' 
WHERE status IS NULL;

-- ============================================================
-- 4. Create indexes for better performance
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_invited_by ON users(invited_by);
CREATE INDEX IF NOT EXISTS idx_users_blocked_by ON users(blocked_by);

-- ============================================================
-- 5. Add constraints
-- ============================================================

-- Ensure blocked users have blocked_at timestamp
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'users_blocked_check'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_blocked_check 
      CHECK (
        (status = 'blocked' AND blocked_at IS NOT NULL) OR 
        (status != 'blocked' AND blocked_at IS NULL)
      );
  END IF;
END $$;

-- ============================================================
-- 6. Comments for documentation
-- ============================================================

COMMENT ON COLUMN users.status IS 
  'User status: active (normal user), pending_invite (invited but not completed signup), blocked (access denied)';

COMMENT ON COLUMN users.invited_at IS 
  'Timestamp when user was invited to the platform';

COMMENT ON COLUMN users.invited_by IS 
  'Admin who invited this user';

COMMENT ON COLUMN users.blocked_at IS 
  'Timestamp when user was blocked';

COMMENT ON COLUMN users.blocked_by IS 
  'Admin who blocked this user';

COMMENT ON COLUMN users.blocked_reason IS 
  'Reason why user was blocked (for admin reference)';
