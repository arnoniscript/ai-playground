-- Migration 012: Add notification metrics tracking
-- Created: 2026-01-08

-- Create notification_dismissals table to track who dismissed and when
CREATE TABLE IF NOT EXISTS notification_dismissals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  dismissed_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Prevent duplicate dismissals
  UNIQUE(notification_id, user_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_notification_dismissals_notification_id 
  ON notification_dismissals(notification_id);
CREATE INDEX IF NOT EXISTS idx_notification_dismissals_user_id 
  ON notification_dismissals(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_dismissals_dismissed_at 
  ON notification_dismissals(dismissed_at DESC);

-- RLS Policies
ALTER TABLE notification_dismissals ENABLE ROW LEVEL SECURITY;

-- Admins can see all dismissals
CREATE POLICY "Admins can view all dismissals"
ON notification_dismissals FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  )
);

-- Users can insert their own dismissals
CREATE POLICY "Users can insert their dismissals"
ON notification_dismissals FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Users can see their own dismissals
CREATE POLICY "Users can view their dismissals"
ON notification_dismissals FOR SELECT
TO authenticated
USING (user_id = auth.uid());
