-- Migration 019: Add ClickUp task columns to curation_conversations
-- Tracks tasks created in ClickUp from curation evaluations.

ALTER TABLE curation_conversations ADD COLUMN IF NOT EXISTS clickup_task_id TEXT;
ALTER TABLE curation_conversations ADD COLUMN IF NOT EXISTS clickup_task_url TEXT;

-- Index for quick lookup
CREATE INDEX IF NOT EXISTS idx_curation_conversations_clickup_task ON curation_conversations(clickup_task_id) WHERE clickup_task_id IS NOT NULL;
