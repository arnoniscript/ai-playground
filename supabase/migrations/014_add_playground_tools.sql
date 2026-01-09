-- Migration: Add tools field to playgrounds
-- Description: Adds JSONB column to store tool configurations (e.g., generate brazilian person)

-- Add tools column to playgrounds table
ALTER TABLE playgrounds
ADD COLUMN IF NOT EXISTS tools JSONB DEFAULT '[]'::jsonb;

-- Update existing rows to have empty array if null
UPDATE playgrounds
SET tools = '[]'::jsonb
WHERE tools IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN playgrounds.tools IS 'Array of enabled tools with their configurations. Example: [{"type": "generate_brazilian_person", "enabled": true}]';
