import { Resend } from "resend";

// Sem RESEND_API_KEY configurada (ex: dev local sem querer testar envio de verdade),
// não quebra a aplicação — só loga o link no console pra dar pra testar o fluxo mesmo assim.
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// Remetente padrão do Resend, funciona sem verificar domínio próprio — dá pra trocar
// depois via EMAIL_FROM quando tiver um domínio verificado no Resend.
const FROM = process.env.EMAIL_FROM || "ProjectFlow <onboarding@resend.dev>";

export async function sendPasswordResetEmail(email: string, link: string) {
  if (!resend) {
    console.warn(`[mailer] RESEND_API_KEY não configurada — link de redefinição de senha para ${email}: ${link}`);
    return;
  }

  const { error } = await resend.emails.send({
    from: FROM,
    to: email,
    subject: "Redefinir sua senha — ProjectFlow",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #111;">Redefinir sua senha</h2>
        <p>Recebemos um pedido para redefinir a senha da sua conta no ProjectFlow.</p>
        <p>
          <a href="${link}" style="display:inline-block;background:#111;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;">
            Redefinir senha
          </a>
        </p>
        <p>Esse link expira em 1 hora. Se você não pediu essa redefinição, pode ignorar este email.</p>
      </div>
    `,
  });

  if (error) {
    console.error("[mailer] Falha ao enviar email de redefinição de senha:", error);
    throw new Error("Não foi possível enviar o email de redefinição de senha.");
  }
}
