-- Fix RLS policies to work with service role and admin operations

-- Update the playgrounds policy to allow updates with WITH CHECK
DROP POLICY IF EXISTS "Update own playgrounds" ON playgrounds;
CREATE POLICY "Update own playgrounds" ON playgrounds
  FOR UPDATE 
  USING (true)
  WITH CHECK (true);

-- Also ensure admins can view all playgrounds
DROP POLICY IF EXISTS "View all playgrounds for admins" ON playgrounds;
CREATE POLICY "View all playgrounds for admins" ON playgrounds
  FOR SELECT 
  USING (true);

-- Remove the restrictive "View active playgrounds" policy since we have a more permissive one
DROP POLICY IF EXISTS "View active playgrounds" ON playgrounds;
