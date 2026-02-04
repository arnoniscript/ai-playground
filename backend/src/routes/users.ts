import { Router } from "express";
import { z } from "zod";
import { supabase } from "../db/client.js";
import { authenticateToken } from "../middleware/auth.js";
import { checkSlackMembership, isSlackIntegrationEnabled } from "../utils/slack.js";
import { config } from "../config.js";

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

router.post("/slack/refresh", authenticateToken, async (req, res) => {
  try {
    if (!isSlackIntegrationEnabled()) {
      return res.status(400).json({ error: "Integração com Slack não configurada" });
    }

    const userId = (req as any).user.id;

    const { data: user, error } = await supabase
      .from("users")
      .select("id, email")
      .eq("id", userId)
      .single();

    if (error || !user) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    if (!user.email) {
      return res.status(400).json({ error: "Usuário não possui email configurado" });
    }

    const slackResult = await checkSlackMembership(user.email);

    if (slackResult.error) {
      return res.status(502).json({
        error: "Falha ao verificar status no Slack",
        detail: slackResult.error,
      });
    }

    const nowIso = new Date().toISOString();

    const { data: updatedUser, error: updateError } = await supabase
      .from("users")
      .update({
        slack_connected: slackResult.isMember,
        slack_checked_at: nowIso,
      })
      .eq("id", user.id)
      .select("slack_connected, slack_checked_at")
      .single();

    if (updateError) {
      console.error("Error updating Slack status:", updateError);
      return res.status(500).json({ error: "Erro ao atualizar status do Slack" });
    }

    res.json({
      data: {
        connected: updatedUser?.slack_connected ?? slackResult.isMember,
        last_checked_at: updatedUser?.slack_checked_at ?? nowIso,
        workspace_url: config.slack.workspaceUrl,
      },
    });
  } catch (error) {
    console.error("Error in POST /users/slack/refresh:", error);
    res.status(500).json({ error: "Erro interno ao verificar Slack" });
  }
});

export default router;
