-- Migration 010: Create notifications system
-- Created: 2026-01-08

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL CHECK (type IN ('banner', 'modal', 'email')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  image_url TEXT,
  
  -- Targeting
  target_type TEXT NOT NULL CHECK (target_type IN ('all', 'role', 'specific')),
  target_role TEXT CHECK (target_role IN ('admin', 'manager', 'tester', 'client', 'qa')),
  target_user_ids UUID[],
  
  -- Control
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  
  -- Tracking (who dismissed)
  dismissed_by UUID[] DEFAULT ARRAY[]::UUID[]
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_notifications_active ON notifications(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- RLS Policies
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins can manage notifications"
ON notifications FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  )
);

-- Users can see active notifications targeted to them
CREATE POLICY "Users can view their notifications"
ON notifications FOR SELECT
TO authenticated
USING (
  is_active = true
  AND expires_at > NOW()
  AND (
    target_type = 'all'
    OR (target_type = 'role' AND target_role = (SELECT role FROM users WHERE id = auth.uid()))
    OR (target_type = 'specific' AND auth.uid() = ANY(target_user_ids))
  )
);

-- Users can update dismissed_by to add themselves
CREATE POLICY "Users can dismiss notifications"
ON notifications FOR UPDATE
TO authenticated
USING (
  is_active = true
  AND (
    target_type = 'all'
    OR (target_type = 'role' AND target_role = (SELECT role FROM users WHERE id = auth.uid()))
    OR (target_type = 'specific' AND auth.uid() = ANY(target_user_ids))
  )
);

-- Create Supabase Storage buckets (if not exists)
-- Note: This is executed via Supabase Dashboard or CLI
-- Keeping here for documentation

-- Bucket: qa-documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'qa-documents',
  'qa-documents',
  false,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Bucket: qa-selfies
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'qa-selfies',
  'qa-selfies',
  false,
  2097152, -- 2MB
  ARRAY['image/jpeg', 'image/png']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for qa-documents
CREATE POLICY "Admins can read all QA documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'qa-documents'
  AND EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  )
);

CREATE POLICY "QAs can read own documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'qa-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Anyone can upload QA documents"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'qa-documents');

CREATE POLICY "Admins can delete QA documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'qa-documents'
  AND EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  )
);

-- Storage policies for qa-selfies
CREATE POLICY "Admins can read all QA selfies"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'qa-selfies'
  AND EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  )
);

CREATE POLICY "QAs can read own selfies"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'qa-selfies'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Anyone can upload QA selfies"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'qa-selfies');

CREATE POLICY "Admins can delete QA selfies"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'qa-selfies'
  AND EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  )
);

-- Comments
COMMENT ON TABLE notifications IS 'System-wide notifications (banner, modal, email) for users';
COMMENT ON COLUMN notifications.type IS 'Type of notification: banner (top bar), modal (center popup), email';
COMMENT ON COLUMN notifications.target_type IS 'Who receives: all (everyone), role (specific role), specific (user IDs)';
COMMENT ON COLUMN notifications.dismissed_by IS 'Array of user IDs who dismissed this notification';
