-- Migration 014: Add bank accounts system for QA payments
-- Created: 2026-01-09

-- Create bank_accounts table
CREATE TABLE IF NOT EXISTS bank_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  account_type TEXT NOT NULL CHECK (account_type IN ('brazilian', 'international')),
  
  -- Brazilian account fields
  agency TEXT,
  account_number TEXT,
  pix_key TEXT,
  
  -- International account fields
  iban TEXT,
  swift_code TEXT,
  international_account_number TEXT,
  bank_name TEXT,
  bank_address TEXT,
  
  -- Status and validation
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  rejected_reason TEXT,
  rejected_at TIMESTAMPTZ,
  rejected_by UUID REFERENCES users(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Only one active account per user
  UNIQUE(user_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_bank_accounts_user_id ON bank_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_status ON bank_accounts(status);

-- RLS Policies
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;

-- Admins can see and manage all accounts
CREATE POLICY "Admins can manage all bank accounts"
ON bank_accounts FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  )
);

-- QAs can see and update their own account
CREATE POLICY "QAs can view own bank account"
ON bank_accounts FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "QAs can insert own bank account"
ON bank_accounts FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "QAs can update own bank account"
ON bank_accounts FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_bank_accounts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER bank_accounts_updated_at
BEFORE UPDATE ON bank_accounts
FOR EACH ROW
EXECUTE FUNCTION update_bank_accounts_updated_at();
