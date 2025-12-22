-- Add course linking to playgrounds
-- This allows playgrounds to require or suggest introductory courses

ALTER TABLE playgrounds
ADD COLUMN linked_course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
ADD COLUMN course_required BOOLEAN DEFAULT FALSE;

-- Add index for better query performance
CREATE INDEX idx_playgrounds_linked_course ON playgrounds(linked_course_id);

-- Add comment for documentation
COMMENT ON COLUMN playgrounds.linked_course_id IS 'Optional reference to a course that users should complete before or alongside using this playground';
COMMENT ON COLUMN playgrounds.course_required IS 'If true, users must complete the linked course before accessing the playground';
