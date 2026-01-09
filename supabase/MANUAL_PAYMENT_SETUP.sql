-- Script SQL para aplicar manualmente as colunas de pagamento
-- Execute este script diretamente no Supabase SQL Editor se a migration falhar

-- 1. Adicionar colunas de pagamento na tabela playgrounds
ALTER TABLE playgrounds ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT false;
ALTER TABLE playgrounds ADD COLUMN IF NOT EXISTS payment_type TEXT CHECK (payment_type IN ('per_hour', 'per_task', 'per_goal'));
ALTER TABLE playgrounds ADD COLUMN IF NOT EXISTS payment_value DECIMAL(10, 2);
ALTER TABLE playgrounds ADD COLUMN IF NOT EXISTS max_time_per_task INTEGER;
ALTER TABLE playgrounds ADD COLUMN IF NOT EXISTS tasks_for_goal INTEGER;

-- 2. Criar tabela qa_earnings
CREATE TABLE IF NOT EXISTS qa_earnings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  playground_id UUID NOT NULL REFERENCES playgrounds(id) ON DELETE CASCADE,
  evaluation_id UUID NOT NULL REFERENCES evaluations(id) ON DELETE CASCADE,
  task_name TEXT NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  time_spent_seconds INTEGER NOT NULL DEFAULT 0,
  amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'under_review' CHECK (status IN ('under_review', 'ready_for_payment', 'paid', 'rejected')),
  paid_at TIMESTAMPTZ,
  rejected_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(evaluation_id)
);

-- 3. Criar índices
CREATE INDEX IF NOT EXISTS idx_qa_earnings_user_id ON qa_earnings(user_id);
CREATE INDEX IF NOT EXISTS idx_qa_earnings_playground_id ON qa_earnings(playground_id);
CREATE INDEX IF NOT EXISTS idx_qa_earnings_status ON qa_earnings(status);
CREATE INDEX IF NOT EXISTS idx_qa_earnings_submitted_at ON qa_earnings(submitted_at DESC);

-- 4. Habilitar RLS
ALTER TABLE qa_earnings ENABLE ROW LEVEL SECURITY;

-- 5. Políticas RLS para admins
DROP POLICY IF EXISTS "Admins can manage all earnings" ON qa_earnings;
CREATE POLICY "Admins can manage all earnings"
ON qa_earnings FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  )
);

-- 6. Políticas RLS para QAs
DROP POLICY IF EXISTS "QAs can view own earnings" ON qa_earnings;
CREATE POLICY "QAs can view own earnings"
ON qa_earnings FOR SELECT
TO authenticated
USING (user_id = auth.uid() AND EXISTS (
  SELECT 1 FROM users 
  WHERE users.id = auth.uid() 
  AND users.role = 'qa'
));

-- 7. Política para backend inserir earnings
DROP POLICY IF EXISTS "Backend can insert earnings" ON qa_earnings;
CREATE POLICY "Backend can insert earnings"
ON qa_earnings FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- 8. Criar view para summary
CREATE OR REPLACE VIEW qa_earnings_summary AS
SELECT 
  user_id,
  COUNT(*) as total_tasks,
  COUNT(*) FILTER (WHERE status = 'under_review') as under_review_count,
  COALESCE(SUM(amount) FILTER (WHERE status = 'under_review'), 0) as under_review_amount,
  COUNT(*) FILTER (WHERE status = 'ready_for_payment') as ready_for_payment_count,
  COALESCE(SUM(amount) FILTER (WHERE status = 'ready_for_payment'), 0) as ready_for_payment_amount,
  COUNT(*) FILTER (WHERE status = 'paid') as paid_count,
  COALESCE(SUM(amount) FILTER (WHERE status = 'paid'), 0) as paid_amount,
  COUNT(*) FILTER (WHERE status = 'rejected') as rejected_count,
  COALESCE(SUM(amount) FILTER (WHERE status = 'rejected'), 0) as rejected_amount,
  COALESCE(SUM(amount) FILTER (WHERE status IN ('paid', 'ready_for_payment')), 0) as total_earned
FROM qa_earnings
GROUP BY user_id;

-- 9. Garantir acesso à view
GRANT SELECT ON qa_earnings_summary TO authenticated;

-- Verificar se funcionou
SELECT 
  column_name, 
  data_type, 
  is_nullable 
FROM information_schema.columns 
WHERE table_name = 'playgrounds' 
AND column_name IN ('is_paid', 'payment_type', 'payment_value', 'max_time_per_task', 'tasks_for_goal');
