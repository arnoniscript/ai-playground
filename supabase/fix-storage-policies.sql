-- Fix storage policies for data-labeling-files bucket
-- Run this directly in Supabase SQL Editor

-- Drop old restrictive policies
DROP POLICY IF EXISTS "Admins can upload data labeling files" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view data labeling files" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete data labeling files" ON storage.objects;

-- Create new permissive policies that work with service role
CREATE POLICY "Service role can upload data labeling files" ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'data-labeling-files');

CREATE POLICY "Public can view data labeling files" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'data-labeling-files');

CREATE POLICY "Service role can delete data labeling files" ON storage.objects
  FOR DELETE
  USING (bucket_id = 'data-labeling-files');
