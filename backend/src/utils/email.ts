import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const emailFrom = process.env.EMAIL_FROM || "onboarding@resend.dev";
const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";

interface SendInviteEmailParams {
  to: string;
  inviterName?: string;
  fullName?: string;
}

export async function sendInviteEmail({ to, inviterName, fullName }: SendInviteEmailParams) {
  try {
    const greeting = fullName ? `Olá ${fullName}` : "Olá";
    const invitedBy = inviterName ? ` por ${inviterName}` : "";

    const { data, error } = await resend.emails.send({
      from: emailFrom,
      to,
      subject: "🎉 Você foi convidado para o Playground de IA da Marisa Care",
      html: `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Convite - Marisa Care</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                  
                  <!-- Header -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
                      <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">
                        🎉 Bem-vindo ao Playground de IA
                      </h1>
                      <p style="margin: 10px 0 0; color: rgba(255, 255, 255, 0.9); font-size: 16px;">
                        Marisa Care
                      </p>
                    </td>
                  </tr>

                  <!-- Content -->
                  <tr>
                    <td style="padding: 40px 30px;">
                      <p style="margin: 0 0 20px; color: #333333; font-size: 16px; line-height: 1.6;">
                        ${greeting},
                      </p>
                      
                      <p style="margin: 0 0 20px; color: #333333; font-size: 16px; line-height: 1.6;">
                        Você foi convidado${invitedBy} para fazer parte da <strong>plataforma de Playgrounds de IA da Marisa Care</strong>! 🚀
                      </p>

                      <p style="margin: 0 0 20px; color: #333333; font-size: 16px; line-height: 1.6;">
                        Nossa plataforma permite que você teste e avalie diferentes modelos de Inteligência Artificial de forma interativa e intuitiva.
                      </p>

                      <div style="background-color: #f8f9fa; border-left: 4px solid #667eea; padding: 16px 20px; margin: 30px 0; border-radius: 4px;">
                        <p style="margin: 0; color: #555555; font-size: 14px; line-height: 1.5;">
                          <strong>📌 Próximos passos:</strong><br>
                          1. Complete seu cadastro clicando no botão abaixo<br>
                          2. Crie sua senha de acesso<br>
                          3. Comece a explorar os playgrounds disponíveis
                        </p>
                      </div>

                      <!-- CTA Button -->
                      <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                        <tr>
                          <td align="center">
                            <a href="${frontendUrl}/login?email=${encodeURIComponent(to)}" 
                               style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(102, 126, 234, 0.3);">
                              ✨ Completar Cadastro
                            </a>
                          </td>
                        </tr>
                      </table>

                      <p style="margin: 30px 0 0; color: #666666; font-size: 14px; line-height: 1.6;">
                        Se o botão não funcionar, copie e cole este link no seu navegador:
                      </p>
                      <p style="margin: 5px 0 0; color: #667eea; font-size: 13px; word-break: break-all;">
                        ${frontendUrl}/login?email=${encodeURIComponent(to)}
                      </p>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #e9ecef;">
                      <p style="margin: 0 0 10px; color: #888888; font-size: 14px;">
                        Marisa Care - Playground de IA
                      </p>
                      <p style="margin: 0; color: #aaaaaa; font-size: 12px;">
                        Este é um email automático, por favor não responda.
                      </p>
                      <p style="margin: 10px 0 0; color: #aaaaaa; font-size: 12px;">
                        Se você não solicitou este convite, pode ignorar este email.
                      </p>
                    </td>
                  </tr>

                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error("Error sending invite email:", error);
      return { success: false, error };
    }

    console.log("Invite email sent successfully:", data);
    return { success: true, data };
  } catch (error) {
    console.error("Exception sending invite email:", error);
    return { success: false, error };
  }
}
