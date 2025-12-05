-- Add evaluation_goal field to playgrounds table
-- This field represents the target number of evaluations for the playground

ALTER TABLE playgrounds 
ADD COLUMN IF NOT EXISTS evaluation_goal INT NOT NULL DEFAULT 100;

-- Add comment to explain the field
COMMENT ON COLUMN playgrounds.evaluation_goal IS 'Target number of evaluations for this playground';
