"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { auth } from "@/auth";
import { ApiError } from "@/lib/errors";
import { fornecedorCreateSchema } from "@/lib/validators";
import { createFornecedor } from "@/services/fornecedorService";
import { requireWorkspaceRole } from "@/services/permissions";

export type ActionState = { status: "idle" } | { status: "error"; error: string } | { status: "success" };

export async function createFornecedorAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) return { status: "error", error: "Não autenticado." };

  const workspaceId = String(formData.get("workspaceId") ?? "");

  try {
    await requireWorkspaceRole(session.user.id, workspaceId, ["administrador", "coordenador", "lider_aprovador", "analista"]);
  } catch (err) {
    if (err instanceof ApiError) return { status: "error", error: err.message };
    throw err;
  }

  let input;
  try {
    input = fornecedorCreateSchema.parse({
      nome: formData.get("nome"),
      cnpj: formData.get("cnpj") || undefined,
      email: formData.get("email") || undefined,
      telefone: formData.get("telefone") || undefined,
    });
  } catch (err) {
    if (err instanceof ZodError) return { status: "error", error: err.issues.map((i) => i.message).join("; ") };
    return { status: "error", error: "Dados inválidos." };
  }

  try {
    await createFornecedor(workspaceId, input);
  } catch (err) {
    if (err instanceof ApiError) return { status: "error", error: err.message };
    throw err;
  }

  revalidatePath(`/workspaces/${workspaceId}/fornecedores`);
  return { status: "success" };
}
