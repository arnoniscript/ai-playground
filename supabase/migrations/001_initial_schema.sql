-- Database Schema for AI Marisa Playground
-- Supabase PostgreSQL Schema with full audit trail and support for A/B testing

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Enums for type-safe columns
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('admin', 'tester');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE playground_type AS ENUM ('ab_testing', 'tuning');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE question_type AS ENUM ('select', 'input_string');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE evaluation_status AS ENUM ('in_progress', 'completed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Table: users
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255),
  role user_role NOT NULL DEFAULT 'tester',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Table: playgrounds
CREATE TABLE IF NOT EXISTS playgrounds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  type playground_type NOT NULL,
  description TEXT,
  support_text TEXT, -- HTML allowed
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  restricted_emails TEXT[] DEFAULT NULL, -- NULL = all logged in users
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_playgrounds_created_by ON playgrounds(created_by);
CREATE INDEX IF NOT EXISTS idx_playgrounds_is_active ON playgrounds(is_active);

-- Table: model_configurations
-- Store info about Model A and Model B in A/B playgrounds
CREATE TABLE IF NOT EXISTS model_configurations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  playground_id UUID NOT NULL REFERENCES playgrounds(id) ON DELETE CASCADE,
  model_key VARCHAR(50) NOT NULL, -- 'model_a' or 'model_b'
  model_name VARCHAR(255) NOT NULL,
  embed_code TEXT NOT NULL, -- Eleven Labs embed script or iframe code
  max_evaluations INT NOT NULL DEFAULT 100,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(playground_id, model_key)
);

CREATE INDEX IF NOT EXISTS idx_model_configurations_playground ON model_configurations(playground_id);

-- Table: evaluation_counters
-- Track evaluation count per model per playground
CREATE TABLE IF NOT EXISTS evaluation_counters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  playground_id UUID NOT NULL REFERENCES playgrounds(id) ON DELETE CASCADE,
  model_key VARCHAR(50) NOT NULL,
  current_count INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(playground_id, model_key)
);

CREATE INDEX IF NOT EXISTS idx_evaluation_counters_playground ON evaluation_counters(playground_id);

-- Table: questions
-- Customized questions per model in A/B testing, or single question set in Tuning
CREATE TABLE IF NOT EXISTS questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  playground_id UUID NOT NULL REFERENCES playgrounds(id) ON DELETE CASCADE,
  model_key VARCHAR(50), -- 'model_a', 'model_b', or NULL for tuning (single model)
  question_text TEXT NOT NULL,
  question_type question_type NOT NULL,
  options JSONB, -- For 'select' type: [{"label": "Option 1", "value": "opt1"}, ...]
  order_index INT NOT NULL DEFAULT 0,
  required BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_questions_playground ON questions(playground_id);
CREATE INDEX IF NOT EXISTS idx_questions_model_key ON questions(model_key);
CREATE INDEX IF NOT EXISTS idx_questions_order ON questions(playground_id, order_index);

-- Table: evaluations
-- Individual responses from testers
CREATE TABLE IF NOT EXISTS evaluations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  playground_id UUID NOT NULL REFERENCES playgrounds(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  model_key VARCHAR(50) NOT NULL, -- 'model_a' or 'model_b'
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  answer_text TEXT, -- For input_string questions
  answer_value VARCHAR(255), -- For select questions
  rating INT CHECK (rating >= 1 AND rating <= 5), -- Optional numeric rating
  session_id UUID, -- To group all answers from single evaluation session
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_evaluations_playground ON evaluations(playground_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_user ON evaluations(user_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_model ON evaluations(model_key);
CREATE INDEX IF NOT EXISTS idx_evaluations_session ON evaluations(session_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_created ON evaluations(created_at);

-- Table: audit_log
-- Track all admin actions for security
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(255) NOT NULL,
  resource_type VARCHAR(100) NOT NULL,
  resource_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_resource ON audit_log(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS users_updated_at_trigger ON users;
CREATE TRIGGER users_updated_at_trigger
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS playgrounds_updated_at_trigger ON playgrounds;
CREATE TRIGGER playgrounds_updated_at_trigger
BEFORE UPDATE ON playgrounds
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS evaluation_counters_updated_at_trigger ON evaluation_counters;
CREATE TRIGGER evaluation_counters_updated_at_trigger
BEFORE UPDATE ON evaluation_counters
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- View for playground metrics
CREATE OR REPLACE VIEW playground_metrics AS
SELECT 
  p.id,
  p.name,
  p.type,
  COUNT(DISTINCT e.user_id) as total_testers,
  COUNT(e.id) as total_evaluations,
  COUNT(CASE WHEN mc.model_key = 'model_a' THEN 1 END) as model_a_evaluations,
  COUNT(CASE WHEN mc.model_key = 'model_b' THEN 1 END) as model_b_evaluations,
  p.created_at,
  p.updated_at
FROM playgrounds p
LEFT JOIN evaluations e ON p.id = e.playground_id
LEFT JOIN model_configurations mc ON p.id = mc.playground_id
GROUP BY p.id, p.name, p.type, p.created_at, p.updated_at;

-- View for question response metrics (for select type questions)
CREATE OR REPLACE VIEW question_metrics AS
SELECT 
  q.id as question_id,
  q.question_text,
  q.playground_id,
  q.model_key,
  e.answer_value,
  COUNT(e.id) as response_count,
  ROUND(100.0 * COUNT(e.id) / SUM(COUNT(e.id)) OVER (PARTITION BY q.id), 2) as percentage
FROM questions q
LEFT JOIN evaluations e ON q.id = e.question_id
WHERE q.question_type = 'select'
GROUP BY q.id, q.question_text, q.playground_id, q.model_key, e.answer_value;

-- View for open-ended responses (input_string questions)
CREATE OR REPLACE VIEW open_responses AS
SELECT 
  q.id as question_id,
  q.question_text,
  q.playground_id,
  q.model_key,
  e.answer_text,
  e.user_id,
  e.created_at
FROM questions q
JOIN evaluations e ON q.id = e.question_id
WHERE q.question_type = 'input_string'
ORDER BY e.created_at DESC;

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE playgrounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
-- Allow all authenticated users to read and insert (controlled by backend)
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON users;
CREATE POLICY "Enable read access for authenticated users" ON users
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable insert for authenticated users" ON users;
CREATE POLICY "Enable insert for authenticated users" ON users
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update for own profile" ON users;
CREATE POLICY "Enable update for own profile" ON users
  FOR UPDATE USING (auth.uid()::uuid = id);

-- RLS Policies for playgrounds (public read for active, write for creator)
DROP POLICY IF EXISTS "View active playgrounds" ON playgrounds;
CREATE POLICY "View active playgrounds" ON playgrounds
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Create playgrounds" ON playgrounds;
CREATE POLICY "Create playgrounds" ON playgrounds
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Update own playgrounds" ON playgrounds;
CREATE POLICY "Update own playgrounds" ON playgrounds
  FOR UPDATE USING (auth.uid()::uuid = created_by);

-- RLS Policies for questions
DROP POLICY IF EXISTS "Enable read access for questions" ON questions;
CREATE POLICY "Enable read access for questions" ON questions
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable insert for questions" ON questions;
CREATE POLICY "Enable insert for questions" ON questions
  FOR INSERT WITH CHECK (true);

-- RLS Policies for evaluations (users can view/create their own)
DROP POLICY IF EXISTS "Users can view own evaluations" ON evaluations;
CREATE POLICY "Users can view own evaluations" ON evaluations
  FOR SELECT USING (auth.uid()::uuid = user_id);

DROP POLICY IF EXISTS "Users can create evaluations" ON evaluations;
CREATE POLICY "Users can create evaluations" ON evaluations
  FOR INSERT WITH CHECK (true);

-- RLS Policies for audit_log (view only)
DROP POLICY IF EXISTS "Enable read access for audit log" ON audit_log;
CREATE POLICY "Enable read access for audit log" ON audit_log
  FOR SELECT USING (true);
