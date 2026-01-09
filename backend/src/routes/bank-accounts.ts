import { Router } from 'express';
import { supabase } from '../db/client';
import { asyncHandler } from '../utils/asyncHandler';
import { authenticateToken } from '../middleware/auth';
import { z } from 'zod';

const router = Router();

// Schema for Brazilian bank account
const BrazilianBankAccountSchema = z.object({
  account_type: z.literal('brazilian'),
  agency: z.string().min(1, 'Agência é obrigatória'),
  account_number: z.string().min(1, 'Número da conta é obrigatório'),
  pix_key: z.string().min(1, 'Chave PIX é obrigatória'),
});

// Schema for International bank account
const InternationalBankAccountSchema = z.object({
  account_type: z.literal('international'),
  iban: z.string().min(1, 'IBAN é obrigatório'),
  swift_code: z.string().min(1, 'Código SWIFT é obrigatório'),
  international_account_number: z.string().min(1, 'Número da conta é obrigatório'),
  bank_name: z.string().min(1, 'Nome do banco é obrigatório'),
  bank_address: z.string().min(1, 'Endereço do banco é obrigatório'),
});

const BankAccountSchema = z.discriminatedUnion('account_type', [
  BrazilianBankAccountSchema,
  InternationalBankAccountSchema,
]);

// QA: Get own bank account
router.get(
  '/',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;

    const { data, error } = await supabase
      .from('bank_accounts')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      return res.status(500).json({ error: error.message });
    }

    res.json({ data: data || null });
  })
);

// QA: Create or update bank account
router.post(
  '/',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    
    // Validate request body
    const validationResult = BankAccountSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({ 
        error: 'Validation error', 
        details: validationResult.error.errors 
      });
    }

    const accountData = validationResult.data;

    // Check if account already exists
    const { data: existingAccount } = await supabase
      .from('bank_accounts')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (existingAccount) {
      // Update existing account
      const updateData: any = {
        account_type: accountData.account_type,
        status: 'pending', // Reset to pending when updating
        rejected_reason: null,
        rejected_at: null,
        rejected_by: null,
      };

      if (accountData.account_type === 'brazilian') {
        updateData.agency = accountData.agency;
        updateData.account_number = accountData.account_number;
        updateData.pix_key = accountData.pix_key;
        // Clear international fields
        updateData.iban = null;
        updateData.swift_code = null;
        updateData.international_account_number = null;
        updateData.bank_name = null;
        updateData.bank_address = null;
      } else {
        updateData.iban = accountData.iban;
        updateData.swift_code = accountData.swift_code;
        updateData.international_account_number = accountData.international_account_number;
        updateData.bank_name = accountData.bank_name;
        updateData.bank_address = accountData.bank_address;
        // Clear brazilian fields
        updateData.agency = null;
        updateData.account_number = null;
        updateData.pix_key = null;
      }

      const { data, error } = await supabase
        .from('bank_accounts')
        .update(updateData)
        .eq('id', existingAccount.id)
        .select()
        .single();

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      return res.json({ data });
    } else {
      // Create new account
      const insertData: any = {
        user_id: userId,
        account_type: accountData.account_type,
        status: 'pending',
      };

      if (accountData.account_type === 'brazilian') {
        insertData.agency = accountData.agency;
        insertData.account_number = accountData.account_number;
        insertData.pix_key = accountData.pix_key;
      } else {
        insertData.iban = accountData.iban;
        insertData.swift_code = accountData.swift_code;
        insertData.international_account_number = accountData.international_account_number;
        insertData.bank_name = accountData.bank_name;
        insertData.bank_address = accountData.bank_address;
      }

      const { data, error } = await supabase
        .from('bank_accounts')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      return res.json({ data });
    }
  })
);

// Admin: Get bank account for a user
router.get(
  '/admin/user/:userId',
  authenticateToken,
  asyncHandler(async (req, res) => {
    if (req.user!.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { userId } = req.params;

    const { data, error } = await supabase
      .from('bank_accounts')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      return res.status(500).json({ error: error.message });
    }

    res.json({ data: data || null });
  })
);

// Admin: Approve bank account
router.put(
  '/admin/:id/approve',
  authenticateToken,
  asyncHandler(async (req, res) => {
    if (req.user!.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { id } = req.params;

    const { data, error } = await supabase
      .from('bank_accounts')
      .update({ 
        status: 'approved',
        rejected_reason: null,
        rejected_at: null,
        rejected_by: null,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ data });
  })
);

// Admin: Reject bank account
router.put(
  '/admin/:id/reject',
  authenticateToken,
  asyncHandler(async (req, res) => {
    if (req.user!.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { id } = req.params;
    const { reason } = req.body;

    if (!reason || !reason.trim()) {
      return res.status(400).json({ error: 'Rejection reason is required' });
    }

    const { data, error } = await supabase
      .from('bank_accounts')
      .update({ 
        status: 'rejected',
        rejected_reason: reason,
        rejected_at: new Date().toISOString(),
        rejected_by: req.user!.id,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ data });
  })
);

export default router;
