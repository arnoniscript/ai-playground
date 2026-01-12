import { Router } from "express";
import { z } from "zod";
import { supabase } from "../db/client.js";
import { authenticateToken } from "../middleware/auth.js";

const router = Router();

const updateProfileSchema = z.object({
  phone: z.string().nullable().optional(),
});

router.get("/profile", authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.id;

    // Buscar dados do usuário
    const { data: profile, error } = await supabase
      .from("users")
      .select("id, email, full_name, document_number, role, phone, birth_date, gender, nationality, primary_language, secondary_languages, document_photo_url, selfie_photo_url, created_at")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("Error fetching user profile:", error);
      return res.status(500).json({ error: "Erro ao buscar perfil" });
    }

    if (!profile) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    // Buscar conta bancária (se existir)
    const { data: bankAccount } = await supabase
      .from("bank_accounts")
      .select("*")
      .eq("user_id", userId)
      .single();

    // Combinar dados
    const completeProfile = {
      ...profile,
      bank_account: bankAccount || null,
    };

    res.json(completeProfile);
  } catch (error) {
    console.error("Error in GET /users/profile:", error);
    res.status(500).json({ error: "Erro interno ao buscar perfil" });
  }
});

router.put("/profile", authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.id;

    const validatedData = updateProfileSchema.parse(req.body);

    // Atualizar dados do usuário
    const { data: updatedProfile, error } = await supabase
      .from("users")
      .update({
        phone: validatedData.phone,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId)
      .select("id, email, full_name, document_number, role, phone, birth_date, gender, nationality, primary_language, secondary_languages, document_photo_url, selfie_photo_url, created_at")
      .single();

    if (error) {
      console.error("Error updating user profile:", error);
      return res.status(500).json({ error: "Erro ao atualizar perfil" });
    }

    if (!updatedProfile) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    // Buscar conta bancária (se existir)
    const { data: bankAccount } = await supabase
      .from("bank_accounts")
      .select("*")
      .eq("user_id", userId)
      .single();

    // Combinar dados
    const completeProfile = {
      ...updatedProfile,
      bank_account: bankAccount || null,
    };

    res.json({
      message: "Perfil atualizado com sucesso",
      profile: completeProfile,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: "Dados inválidos",
        details: error.errors,
      });
    }

    console.error("Error in PUT /users/profile:", error);
    res.status(500).json({ error: "Erro interno ao atualizar perfil" });
  }
});

export default router;
