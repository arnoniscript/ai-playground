-- Migration 017: Add address field to users table
-- Created: 2026-01-08

-- Add address column for user profiles
ALTER TABLE users ADD COLUMN IF NOT EXISTS address TEXT;

-- Add comment for documentation
COMMENT ON COLUMN users.address IS 'Physical address of the user (street, number, city, state)';
