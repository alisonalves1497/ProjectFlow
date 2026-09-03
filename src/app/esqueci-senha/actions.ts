"use server";

import { headers } from "next/headers";
import { ZodError } from "zod";
import { passwordResetRequestSchema } from "@/lib/validators";
import { requestPasswordReset } from "@/services/passwordResetService";

export type ActionState = { status: "idle" } | { status: "error"; error: string } | { status: "success" };

// Sempre devolve sucesso pra quem chama (exista o email ou não) — a mensagem genérica
// evita que alguém use esse formulário pra descobrir quais emails têm conta no sistema.
export async function requestPasswordResetAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  let input;
  try {
    input = passwordResetRequestSchema.parse({ email: formData.get("email") });
  } catch (err) {
    if (err instanceof ZodError) return { status: "error", error: "Email inválido." };
    return { status: "error", error: "Dados inválidos." };
  }

  const headersList = await headers();
  const host = headersList.get("host") ?? "localhost:3000";
  const protocol = host.startsWith("localhost") ? "http" : "https";
  const baseUrl = `${protocol}://${host}`;

  try {
    await requestPasswordReset(input.email, baseUrl);
  } catch (err) {
    console.error("[esqueci-senha] Falha ao processar pedido de redefinição:", err);
    return { status: "error", error: "Não foi possível enviar o email agora. Tente de novo em instantes." };
  }

  return { status: "success" };
}
