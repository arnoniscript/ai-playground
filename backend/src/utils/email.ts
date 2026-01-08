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

// QA Registration Emails

const emailContent = {
  pt: {
    pending: {
      subject: "⏳ Seu cadastro está em análise",
      title: "Cadastro Recebido!",
      greeting: (name: string) => `Olá ${name}`,
      message: "Obrigado por se cadastrar como QA na nossa plataforma. Seu cadastro foi recebido e está sendo analisado por nossa equipe.",
      timeline: "Você receberá um email em até 3 dias úteis com o resultado da análise.",
      thanks: "Agradecemos seu interesse!",
    },
    approved: {
      subject: "✅ Cadastro aprovado! Bem-vindo à equipe",
      title: "Parabéns! Você foi aprovado",
      greeting: (name: string) => `Olá ${name}`,
      message: "Ficamos felizes em informar que seu cadastro foi aprovado!",
      cta: "Acessar Plataforma",
      instructions: "Agora você pode fazer login e começar a trabalhar com nossos playgrounds de IA.",
      welcomeTeam: "Bem-vindo à equipe do Playground da Marisa Care!",
    },
    rejected: {
      subject: "❌ Atualização sobre seu cadastro",
      title: "Sobre seu Cadastro",
      greeting: (name: string) => `Olá ${name}`,
      message: "Agradecemos seu interesse em fazer parte da nossa equipe de QA.",
      reasonLabel: "Motivo:",
      unfortunately: "Infelizmente, não foi possível aprovar seu cadastro neste momento.",
      reapply: "Você poderá se cadastrar novamente no futuro.",
      thanks: "Agradecemos seu interesse e desejamos sucesso em sua carreira!",
    },
  },
  en: {
    pending: {
      subject: "⏳ Your registration is under review",
      title: "Registration Received!",
      greeting: (name: string) => `Hello ${name}`,
      message: "Thank you for registering as a QA on our platform. Your registration has been received and is being reviewed by our team.",
      timeline: "You will receive an email within 3 business days with the analysis result.",
      thanks: "Thank you for your interest!",
    },
    approved: {
      subject: "✅ Registration approved! Welcome to the team",
      title: "Congratulations! You've been approved",
      greeting: (name: string) => `Hello ${name}`,
      message: "We're happy to inform you that your registration has been approved!",
      cta: "Access Platform",
      instructions: "You can now login and start working with our AI playgrounds.",
      welcomeTeam: "Welcome to the Marisa Care team!",
    },
    rejected: {
      subject: "❌ Update on your registration",
      title: "About your Registration",
      greeting: (name: string) => `Hello ${name}`,
      message: "We appreciate your interest in joining our QA team.",
      reasonLabel: "Reason:",
      unfortunately: "Unfortunately, we were unable to approve your registration at this time.",
      reapply: "You may reapply in the future.",
      thanks: "We thank you for your interest and wish you success in your career!",
    },
  },
  es: {
    pending: {
      subject: "⏳ Su registro está en revisión",
      title: "¡Registro Recibido!",
      greeting: (name: string) => `Hola ${name}`,
      message: "Gracias por registrarse como QA en nuestra plataforma. Su registro ha sido recibido y está siendo revisado por nuestro equipo.",
      timeline: "Recibirá un correo electrónico dentro de 3 días hábiles con el resultado del análisis.",
      thanks: "¡Agradecemos su interés!",
    },
    approved: {
      subject: "✅ ¡Registro aprobado! Bienvenido al equipo",
      title: "¡Felicitaciones! Has sido aprobado",
      greeting: (name: string) => `Hola ${name}`,
      message: "¡Nos complace informarle que su registro ha sido aprobado!",
      cta: "Acceder a la Plataforma",
      instructions: "Ahora puede iniciar sesión y comenzar a trabajar con nuestros playgrounds de IA.",
      welcomeTeam: "¡Bienvenido al equipo de Marisa Care!",
    },
    rejected: {
      subject: "❌ Actualización sobre su registro",
      title: "Sobre su Registro",
      greeting: (name: string) => `Hola ${name}`,
      message: "Agradecemos su interés en unirse a nuestro equipo de QA.",
      reasonLabel: "Motivo:",
      unfortunately: "Lamentablemente, no pudimos aprobar su registro en este momento.",
      reapply: "Puede volver a registrarse en el futuro.",
      thanks: "¡Le agradecemos su interés y le deseamos éxito en su carrera!",
    },
  },
};

interface SendQAEmailParams {
  to: string;
  fullName: string;
  language: 'pt' | 'en' | 'es';
  reason?: string;
}

export async function sendQARegistrationPendingEmail({ to, fullName, language }: SendQAEmailParams) {
  const content = emailContent[language].pending;

  try {
    const { data, error } = await resend.emails.send({
      from: emailFrom,
      to,
      subject: content.subject,
      html: `
        <!DOCTYPE html>
        <html lang="${language}">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                  
                  <tr>
                    <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
                      <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">
                        ${content.title}
                      </h1>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding: 40px 30px;">
                      <p style="margin: 0 0 20px; color: #333333; font-size: 18px; font-weight: 600;">
                        ${content.greeting(fullName)},
                      </p>
                      <p style="margin: 0 0 15px; color: #555555; font-size: 16px; line-height: 1.6;">
                        ${content.message}
                      </p>
                      <div style="background-color: #f8f9fa; border-left: 4px solid #667eea; padding: 15px 20px; margin: 20px 0; border-radius: 4px;">
                        <p style="margin: 0; color: #555555; font-size: 14px; line-height: 1.6;">
                          ⏰ ${content.timeline}
                        </p>
                      </div>
                      <p style="margin: 20px 0 0; color: #555555; font-size: 16px; line-height: 1.6;">
                        ${content.thanks}
                      </p>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding: 30px; background-color: #f8f9fa; text-align: center; border-top: 1px solid #e0e0e0;">
                      <p style="margin: 0; color: #888888; font-size: 12px;">
                        Marisa Care © ${new Date().getFullYear()}
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
      console.error("Error sending QA pending email:", error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Exception sending QA pending email:", error);
    return { success: false, error };
  }
}

export async function sendQAApprovedEmail({ to, fullName, language }: SendQAEmailParams) {
  const content = emailContent[language].approved;

  try {
    const { data, error } = await resend.emails.send({
      from: emailFrom,
      to,
      subject: content.subject,
      html: `
        <!DOCTYPE html>
        <html lang="${language}">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                  
                  <tr>
                    <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 30px; text-align: center;">
                      <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">
                        ✅ ${content.title}
                      </h1>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding: 40px 30px;">
                      <p style="margin: 0 0 20px; color: #333333; font-size: 18px; font-weight: 600;">
                        ${content.greeting(fullName)},
                      </p>
                      <p style="margin: 0 0 15px; color: #555555; font-size: 16px; line-height: 1.6;">
                        ${content.message}
                      </p>
                      <p style="margin: 0 0 25px; color: #555555; font-size: 16px; line-height: 1.6;">
                        ${content.instructions}
                      </p>
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td align="center">
                            <a href="${frontendUrl}/login" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600;">
                              ${content.cta}
                            </a>
                          </td>
                        </tr>
                      </table>
                      <div style="background-color: #f0fdf4; border-left: 4px solid #10b981; padding: 15px 20px; margin: 30px 0; border-radius: 4px;">
                        <p style="margin: 0; color: #065f46; font-size: 14px; font-weight: 600;">
                          🎉 ${content.welcomeTeam}
                        </p>
                      </div>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding: 30px; background-color: #f8f9fa; text-align: center; border-top: 1px solid #e0e0e0;">
                      <p style="margin: 0; color: #888888; font-size: 12px;">
                        Marisa Care © ${new Date().getFullYear()}
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
      console.error("Error sending QA approved email:", error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Exception sending QA approved email:", error);
    return { success: false, error };
  }
}

export async function sendQARejectedEmail({ to, fullName, language, reason }: SendQAEmailParams) {
  const content = emailContent[language].rejected;

  try {
    const { data, error } = await resend.emails.send({
      from: emailFrom,
      to,
      subject: content.subject,
      html: `
        <!DOCTYPE html>
        <html lang="${language}">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                  
                  <tr>
                    <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
                      <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">
                        ${content.title}
                      </h1>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding: 40px 30px;">
                      <p style="margin: 0 0 20px; color: #333333; font-size: 18px; font-weight: 600;">
                        ${content.greeting(fullName)},
                      </p>
                      <p style="margin: 0 0 15px; color: #555555; font-size: 16px; line-height: 1.6;">
                        ${content.message}
                      </p>
                      <p style="margin: 0 0 15px; color: #555555; font-size: 16px; line-height: 1.6;">
                        ${content.unfortunately}
                      </p>
                      ${reason ? `
                      <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 15px 20px; margin: 20px 0; border-radius: 4px;">
                        <p style="margin: 0 0 5px; color: #991b1b; font-size: 14px; font-weight: 600;">
                          ${content.reasonLabel}
                        </p>
                        <p style="margin: 0; color: #7f1d1d; font-size: 14px; line-height: 1.6;">
                          ${reason}
                        </p>
                      </div>
                      ` : ''}
                      <p style="margin: 20px 0 0; color: #555555; font-size: 16px; line-height: 1.6;">
                        ${content.reapply}
                      </p>
                      <p style="margin: 15px 0 0; color: #555555; font-size: 16px; line-height: 1.6;">
                        ${content.thanks}
                      </p>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding: 30px; background-color: #f8f9fa; text-align: center; border-top: 1px solid #e0e0e0;">
                      <p style="margin: 0; color: #888888; font-size: 12px;">
                        Marisa Care © ${new Date().getFullYear()}
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
      console.error("Error sending QA rejected email:", error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Exception sending QA rejected email:", error);
    return { success: false, error };
  }
}

