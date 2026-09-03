import crypto from "crypto";
import bcrypt from "bcryptjs";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { users, verificationTokens } from "@/db/schema";
import { badRequest } from "@/lib/errors";
import { sendPasswordResetEmail } from "@/lib/mailer";

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hora
const PREFIXO_IDENTIFIER = "reset:";

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

// Sempre "funciona" do ponto de vista de quem chama, exista ou não o email — não dá
// pra vazar pra fora se um email tem conta ou não (evita enumeração de usuários).
export async function requestPasswordReset(email: string, baseUrl: string) {
  const [user] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (!user) return;

  const identifier = `${PREFIXO_IDENTIFIER}${email}`;

  // Limpa qualquer token anterior pendente pra esse email antes de criar um novo —
  // só o link mais recente enviado deve funcionar.
  await db.delete(verificationTokens).where(eq(verificationTokens.identifier, identifier));

  const token = crypto.randomBytes(32).toString("hex");
  await db.insert(verificationTokens).values({
    identifier,
    token: hashToken(token),
    expires: new Date(Date.now() + TOKEN_TTL_MS),
  });

  const link = `${baseUrl}/redefinir-senha?email=${encodeURIComponent(email)}&token=${token}`;
  await sendPasswordResetEmail(email, link);
}

export async function resetPasswordWithToken(email: string, token: string, novaSenha: string) {
  const identifier = `${PREFIXO_IDENTIFIER}${email}`;
  const tokenHash = hashToken(token);

  const [row] = await db
    .select()
    .from(verificationTokens)
    .where(and(eq(verificationTokens.identifier, identifier), eq(verificationTokens.token, tokenHash)))
    .limit(1);

  if (!row || row.expires < new Date()) {
    throw badRequest("TOKEN_INVALIDO", "Esse link expirou ou já foi usado. Peça um novo link de redefinição.");
  }

  const passwordHash = await bcrypt.hash(novaSenha, 10);
  await db.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.email, email));

  await db
    .delete(verificationTokens)
    .where(and(eq(verificationTokens.identifier, identifier), eq(verificationTokens.token, tokenHash)));
}
