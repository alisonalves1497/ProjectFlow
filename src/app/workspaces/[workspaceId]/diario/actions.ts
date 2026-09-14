"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { ApiError } from "@/lib/errors";
import { createEntradaDiario, updateEntradaDiario, deleteEntradaDiario } from "@/services/diarioService";
import { buscarDocumentosNoWorkspace } from "@/services/documentoService";
import { listAccessibleObraIdsInWorkspace } from "@/services/permissions";

export type ActionState = { status: "idle" } | { status: "error"; error: string } | { status: "success" };

export async function criarEntradaDiarioAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) return { status: "error", error: "Não autenticado." };

  const workspaceId = String(formData.get("workspaceId") ?? "");
  const data = String(formData.get("data") ?? "");
  const texto = String(formData.get("texto") ?? "");
  const documentoIdRaw = formData.get("documentoId");

  try {
    await createEntradaDiario(workspaceId, session.user.id, {
      data,
      texto,
      documentoId: documentoIdRaw ? String(documentoIdRaw) : null,
    });
  } catch (err) {
    if (err instanceof ApiError) return { status: "error", error: err.message };
    throw err;
  }

  revalidatePath(`/workspaces/${workspaceId}/diario`);
  return { status: "success" };
}

export async function atualizarEntradaDiarioAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) return { status: "error", error: "Não autenticado." };

  const workspaceId = String(formData.get("workspaceId") ?? "");
  const entradaId = String(formData.get("entradaId") ?? "");
  const documentoIdRaw = formData.get("documentoId");

  try {
    await updateEntradaDiario(workspaceId, session.user.id, entradaId, {
      texto: formData.has("texto") ? String(formData.get("texto")) : undefined,
      data: formData.has("data") ? String(formData.get("data")) : undefined,
      documentoId: formData.has("documentoId") ? (documentoIdRaw ? String(documentoIdRaw) : null) : undefined,
    });
  } catch (err) {
    if (err instanceof ApiError) return { status: "error", error: err.message };
    throw err;
  }

  revalidatePath(`/workspaces/${workspaceId}/diario`);
  return { status: "success" };
}

export async function excluirEntradaDiarioAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) return { status: "error", error: "Não autenticado." };

  const workspaceId = String(formData.get("workspaceId") ?? "");
  const entradaId = String(formData.get("entradaId") ?? "");

  try {
    await deleteEntradaDiario(workspaceId, session.user.id, entradaId);
  } catch (err) {
    if (err instanceof ApiError) return { status: "error", error: err.message };
    throw err;
  }

  revalidatePath(`/workspaces/${workspaceId}/diario`);
  return { status: "success" };
}

// Busca de documento pra vincular (opcional) — chamada direto pelo client component
// enquanto a pessoa digita, sem passar por useActionState (não é um form submit).
export async function buscarDocumentosParaDiarioAction(workspaceId: string, termo: string) {
  const session = await auth();
  if (!session?.user?.id) return [];
  if (termo.trim().length < 2) return [];
  const obraIds = await listAccessibleObraIdsInWorkspace(session.user.id, workspaceId);
  return buscarDocumentosNoWorkspace(workspaceId, obraIds, termo, 8);
}
