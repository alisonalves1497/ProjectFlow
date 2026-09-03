"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { auth } from "@/auth";
import { ApiError } from "@/lib/errors";
import { itemConhecimentoCreateSchema, itemConhecimentoAvancarSchema } from "@/lib/validators";
import { createItemConhecimento, avancarStatus } from "@/services/conhecimentoService";
import { requireObraAccess } from "@/services/permissions";

export type ActionState = { status: "idle" } | { status: "error"; error: string } | { status: "success" };

function obraConhecimentoPath(workspaceId: string, projetoId: string, obraId: string) {
  return `/workspaces/${workspaceId}/projetos/${projetoId}/obras/${obraId}/conhecimento`;
}

export async function createItemConhecimentoAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) return { status: "error", error: "Não autenticado." };

  const workspaceId = String(formData.get("workspaceId") ?? "");
  const projetoId = String(formData.get("projetoId") ?? "");
  const obraId = String(formData.get("obraId") ?? "");
  const revalidatePathTarget = String(formData.get("revalidatePathTarget") ?? "") || obraConhecimentoPath(workspaceId, projetoId, obraId);

  let input;
  try {
    input = itemConhecimentoCreateSchema.parse({
      tipo: formData.get("tipo"),
      titulo: formData.get("titulo"),
      descricao: formData.get("descricao"),
      categoriaId: formData.get("categoriaId") || undefined,
      documentoIds: formData.getAll("documentoIds").map(String).filter(Boolean),
    });
  } catch (err) {
    if (err instanceof ZodError) return { status: "error", error: err.issues.map((i) => i.message).join("; ") };
    return { status: "error", error: "Dados inválidos." };
  }

  try {
    await requireObraAccess(session.user.id, workspaceId, obraId);
    await createItemConhecimento(workspaceId, obraId, session.user.id, input);
  } catch (err) {
    if (err instanceof ApiError) return { status: "error", error: err.message };
    throw err;
  }

  revalidatePath(revalidatePathTarget);
  return { status: "success" };
}

export async function avancarStatusAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) return { status: "error", error: "Não autenticado." };

  const workspaceId = String(formData.get("workspaceId") ?? "");
  const projetoId = String(formData.get("projetoId") ?? "");
  const obraId = String(formData.get("obraId") ?? "");
  const itemId = String(formData.get("itemId") ?? "");

  let input;
  try {
    input = itemConhecimentoAvancarSchema.parse({
      resposta: formData.get("resposta") || undefined,
      acaoCorretiva: formData.get("acaoCorretiva") || undefined,
    });
  } catch (err) {
    if (err instanceof ZodError) return { status: "error", error: err.issues.map((i) => i.message).join("; ") };
    return { status: "error", error: "Dados inválidos." };
  }

  try {
    await requireObraAccess(session.user.id, workspaceId, obraId);
    await avancarStatus(workspaceId, itemId, session.user.id, input);
  } catch (err) {
    if (err instanceof ApiError) return { status: "error", error: err.message };
    throw err;
  }

  revalidatePath(`${obraConhecimentoPath(workspaceId, projetoId, obraId)}/${itemId}`);
  return { status: "success" };
}
