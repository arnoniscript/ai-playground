-- Migration 009: Add QA-specific fields to users table
-- Created: 2026-01-08

-- Add new status to user_status enum
ALTER TYPE user_status ADD VALUE IF NOT EXISTS 'pending_approval';

-- Add QA-specific columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS primary_language TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS nationality TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS birth_date DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS gender TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS secondary_languages TEXT[]; -- Array of language codes
ALTER TABLE users ADD COLUMN IF NOT EXISTS document_number TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS document_photo_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS selfie_photo_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS geolocation JSONB; -- {latitude, longitude, accuracy}
ALTER TABLE users ADD COLUMN IF NOT EXISTS ip_address TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS education JSONB; -- Array of education objects
ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS rejected_by UUID REFERENCES users(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Create index for QA management queries
CREATE INDEX IF NOT EXISTS idx_users_role_status ON users(role, status) WHERE role = 'qa';
CREATE INDEX IF NOT EXISTS idx_users_pending_approval ON users(status) WHERE status = 'pending_approval';

-- Add comments for documentation
COMMENT ON COLUMN users.primary_language IS 'Primary language selected during registration (en, pt, es)';
COMMENT ON COLUMN users.secondary_languages IS 'Array of additional languages the QA speaks';
COMMENT ON COLUMN users.education IS 'JSON array of education objects: [{degree, institution, field, year_start, year_end, description}]';
COMMENT ON COLUMN users.geolocation IS 'JSON object with latitude, longitude, and accuracy from browser geolocation';
COMMENT ON COLUMN users.ip_address IS 'IP address captured during registration';
COMMENT ON COLUMN users.document_photo_url IS 'URL to uploaded document photo (ID, passport, etc)';
COMMENT ON COLUMN users.selfie_photo_url IS 'URL to selfie photo taken via webcam during registration';
