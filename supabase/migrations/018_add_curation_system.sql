-- Migration 018: Add Curation (Curadoria) Playground System
-- This adds support for a new playground type that integrates with ElevenLabs
-- conversation API for quality assurance/curation of voice agent calls.

-- 1. Add 'curation' to the playground_type enum
ALTER TYPE playground_type ADD VALUE IF NOT EXISTS 'curation';

-- 2. Add curation-specific columns to playgrounds table
ALTER TABLE playgrounds ADD COLUMN IF NOT EXISTS curation_mode TEXT CHECK (curation_mode IN ('continuous', 'date_range'));
ALTER TABLE playgrounds ADD COLUMN IF NOT EXISTS curation_agent_id TEXT;
ALTER TABLE playgrounds ADD COLUMN IF NOT EXISTS curation_date_start TIMESTAMPTZ;
ALTER TABLE playgrounds ADD COLUMN IF NOT EXISTS curation_date_end TIMESTAMPTZ;
ALTER TABLE playgrounds ADD COLUMN IF NOT EXISTS curation_passes_per_conversation INTEGER DEFAULT 1;

-- 3. Create curation_conversations table
-- Stores synced conversations from ElevenLabs for curation playgrounds
CREATE TABLE IF NOT EXISTS curation_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playground_id UUID NOT NULL REFERENCES playgrounds(id) ON DELETE CASCADE,
  conversation_id TEXT NOT NULL, -- ElevenLabs conversation_id (primary key for a conversation)
  agent_id TEXT NOT NULL,
  duration_seconds INTEGER,
  call_datetime TIMESTAMPTZ,
  transcript JSONB, -- Full transcript array from ElevenLabs
  audio_url TEXT, -- URL to conversation audio
  call_status TEXT, -- Status from ElevenLabs API (e.g. 'success', 'failed', 'unknown', 'error')
  call_termination_reason TEXT, -- How the call ended (e.g. 'transferred', 'user_dropped', 'agent_ended', etc.)
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'excluded')),
  selected BOOLEAN DEFAULT TRUE, -- Whether this conversation is selected for curation (date_range mode)
  max_passes INTEGER DEFAULT 1, -- How many times this conversation should go through the pipe
  current_passes INTEGER DEFAULT 0, -- How many times it has been evaluated
  metadata JSONB, -- Additional metadata from ElevenLabs
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(playground_id, conversation_id)
);

-- 3b. Add columns if table already exists (idempotent)
ALTER TABLE curation_conversations ADD COLUMN IF NOT EXISTS call_status TEXT;
ALTER TABLE curation_conversations ADD COLUMN IF NOT EXISTS call_termination_reason TEXT;

-- 4. Create curation_evaluations table
-- Tracks which user evaluated which conversation (prevents same user evaluating same conversation twice)
CREATE TABLE IF NOT EXISTS curation_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_record_id UUID NOT NULL REFERENCES curation_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id UUID NOT NULL,
  evaluated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(conversation_record_id, user_id) -- Same user cannot evaluate same conversation twice
);

-- 5. Create function to get next curation conversation for a user
DROP FUNCTION IF EXISTS get_next_curation_conversation(UUID, UUID);
CREATE OR REPLACE FUNCTION get_next_curation_conversation(
  p_playground_id UUID,
  p_user_id UUID
)
RETURNS TABLE (
  conversation_record_id UUID,
  conversation_id TEXT,
  agent_id TEXT,
  duration_seconds INTEGER,
  call_datetime TIMESTAMPTZ,
  transcript JSONB,
  audio_url TEXT,
  call_status TEXT,
  call_termination_reason TEXT,
  metadata JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cc.id AS conversation_record_id,
    cc.conversation_id,
    cc.agent_id,
    cc.duration_seconds,
    cc.call_datetime,
    cc.transcript,
    cc.audio_url,
    cc.call_status,
    cc.call_termination_reason,
    cc.metadata
  FROM curation_conversations cc
  WHERE cc.playground_id = p_playground_id
    AND cc.selected = TRUE
    AND cc.status != 'excluded'
    AND cc.current_passes < cc.max_passes
    -- Exclude conversations already evaluated by this user
    AND cc.id NOT IN (
      SELECT ce.conversation_record_id
      FROM curation_evaluations ce
      WHERE ce.user_id = p_user_id
    )
  ORDER BY RANDOM()
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- 6. Create trigger to increment current_passes when evaluation is recorded
CREATE OR REPLACE FUNCTION increment_curation_passes()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE curation_conversations
  SET current_passes = current_passes + 1,
      status = CASE
        WHEN current_passes + 1 >= max_passes THEN 'completed'
        ELSE 'in_progress'
      END,
      updated_at = NOW()
  WHERE id = NEW.conversation_record_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_increment_curation_passes ON curation_evaluations;
CREATE TRIGGER trigger_increment_curation_passes
  AFTER INSERT ON curation_evaluations
  FOR EACH ROW
  EXECUTE FUNCTION increment_curation_passes();

-- 7. Create function to get curation metrics
CREATE OR REPLACE FUNCTION get_curation_metrics(p_playground_id UUID)
RETURNS TABLE (
  total_conversations BIGINT,
  selected_conversations BIGINT,
  pending_conversations BIGINT,
  in_progress_conversations BIGINT,
  completed_conversations BIGINT,
  excluded_conversations BIGINT,
  total_expected_evaluations BIGINT,
  completed_evaluations BIGINT,
  completion_percentage NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT AS total_conversations,
    COUNT(*) FILTER (WHERE cc.selected = TRUE)::BIGINT AS selected_conversations,
    COUNT(*) FILTER (WHERE cc.status = 'pending' AND cc.selected = TRUE)::BIGINT AS pending_conversations,
    COUNT(*) FILTER (WHERE cc.status = 'in_progress')::BIGINT AS in_progress_conversations,
    COUNT(*) FILTER (WHERE cc.status = 'completed')::BIGINT AS completed_conversations,
    COUNT(*) FILTER (WHERE cc.status = 'excluded' OR cc.selected = FALSE)::BIGINT AS excluded_conversations,
    COALESCE(SUM(cc.max_passes) FILTER (WHERE cc.selected = TRUE), 0)::BIGINT AS total_expected_evaluations,
    COALESCE(SUM(cc.current_passes) FILTER (WHERE cc.selected = TRUE), 0)::BIGINT AS completed_evaluations,
    CASE
      WHEN COALESCE(SUM(cc.max_passes) FILTER (WHERE cc.selected = TRUE), 0) = 0 THEN 0
      ELSE ROUND(
        (COALESCE(SUM(cc.current_passes) FILTER (WHERE cc.selected = TRUE), 0)::NUMERIC / 
         COALESCE(SUM(cc.max_passes) FILTER (WHERE cc.selected = TRUE), 1)::NUMERIC) * 100,
        1
      )
    END AS completion_percentage
  FROM curation_conversations cc
  WHERE cc.playground_id = p_playground_id;
END;
$$ LANGUAGE plpgsql;

-- 8. RLS Policies
ALTER TABLE curation_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE curation_evaluations ENABLE ROW LEVEL SECURITY;

-- Service role can do everything
DROP POLICY IF EXISTS "Service role full access on curation_conversations" ON curation_conversations;
CREATE POLICY "Service role full access on curation_conversations"
  ON curation_conversations FOR ALL
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on curation_evaluations" ON curation_evaluations;
CREATE POLICY "Service role full access on curation_evaluations"
  ON curation_evaluations FOR ALL
  USING (true)
  WITH CHECK (true);

-- 9. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_curation_conversations_playground ON curation_conversations(playground_id);
CREATE INDEX IF NOT EXISTS idx_curation_conversations_status ON curation_conversations(status);
CREATE INDEX IF NOT EXISTS idx_curation_conversations_selected ON curation_conversations(selected);
CREATE INDEX IF NOT EXISTS idx_curation_evaluations_conversation ON curation_evaluations(conversation_record_id);
CREATE INDEX IF NOT EXISTS idx_curation_evaluations_user ON curation_evaluations(user_id);
