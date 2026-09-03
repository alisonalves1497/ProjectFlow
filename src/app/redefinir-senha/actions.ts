"use server";

import { ZodError } from "zod";
import { ApiError } from "@/lib/errors";
import { passwordResetConfirmSchema } from "@/lib/validators";
import { resetPasswordWithToken } from "@/services/passwordResetService";

export type ActionState = { status: "idle" } | { status: "error"; error: string } | { status: "success" };

export async function resetPasswordAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const senha = String(formData.get("novaSenha") ?? "");
  const confirmarSenha = String(formData.get("confirmarSenha") ?? "");
  if (senha !== confirmarSenha) {
    return { status: "error", error: "As senhas não coincidem." };
  }

  let input;
  try {
    input = passwordResetConfirmSchema.parse({
      email: formData.get("email"),
      token: formData.get("token"),
      novaSenha: senha,
    });
  } catch (err) {
    if (err instanceof ZodError) return { status: "error", error: err.issues.map((i) => i.message).join("; ") };
    return { status: "error", error: "Dados inválidos." };
  }

  try {
    await resetPasswordWithToken(input.email, input.token, input.novaSenha);
  } catch (err) {
    if (err instanceof ApiError) return { status: "error", error: err.message };
    throw err;
  }

  return { status: "success" };
}
