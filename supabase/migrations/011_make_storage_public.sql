-- Make storage buckets public for qa-documents and qa-selfies
-- The URLs are protected by UUIDs which are hard to guess

-- Update buckets to be public
UPDATE storage.buckets 
SET public = true 
WHERE id IN ('qa-documents', 'qa-selfies');

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Admins can read all QA documents" ON storage.objects;
DROP POLICY IF EXISTS "QAs can read own documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins can read all QA selfies" ON storage.objects;
DROP POLICY IF EXISTS "QAs can read own selfies" ON storage.objects;

-- Create public read policies
CREATE POLICY "Public can read QA documents"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'qa-documents');

CREATE POLICY "Public can read QA selfies"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'qa-selfies');

-- Keep existing insert and delete policies (they allow public insert and admin delete)
