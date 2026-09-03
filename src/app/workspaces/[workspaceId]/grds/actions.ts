"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { auth } from "@/auth";
import { ApiError } from "@/lib/errors";
import { grdCreateSchema, grdResponderSchema } from "@/lib/validators";
import { cancelarGrd, createGrd, getGrdOrThrow, responderGrd } from "@/services/grdService";
import { requireObraAccess } from "@/services/permissions";

export type ActionState = { status: "idle" } | { status: "error"; error: string } | { status: "success" };

export async function createGrdAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) return { status: "error", error: "Não autenticado." };

  const workspaceId = String(formData.get("workspaceId") ?? "");
  const projetoId = String(formData.get("projetoId") ?? "");
  const obraId = String(formData.get("obraId") ?? "");

  try {
    await requireObraAccess(session.user.id, workspaceId, obraId);
  } catch (err) {
    if (err instanceof ApiError) return { status: "error", error: err.message };
    throw err;
  }

  let input;
  try {
    input = grdCreateSchema.parse({
      obraId,
      dataEmissao: formData.get("dataEmissao"),
      documentoIds: formData.getAll("documentoIds"),
      contatoExternoIds: formData.getAll("contatoExternoIds"),
    });
  } catch (err) {
    if (err instanceof ZodError) return { status: "error", error: err.issues.map((i) => i.message).join("; ") };
    return { status: "error", error: "Dados inválidos." };
  }

  try {
    await createGrd(workspaceId, session.user.id, input);
  } catch (err) {
    if (err instanceof ApiError) return { status: "error", error: err.message };
    throw err;
  }

  revalidatePath(`/workspaces/${workspaceId}/projetos/${projetoId}/obras/${obraId}`);
  return { status: "success" };
}

export async function responderGrdAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) return { status: "error", error: "Não autenticado." };

  const workspaceId = String(formData.get("workspaceId") ?? "");
  const grdId = String(formData.get("grdId") ?? "");

  try {
    const grd = await getGrdOrThrow(workspaceId, grdId);
    await requireObraAccess(session.user.id, workspaceId, grd.obraId);
    const input = grdResponderSchema.parse({
      arquivoRespostaNome: formData.get("arquivoRespostaNome") || undefined,
      arquivoRespostaUrl: formData.get("arquivoRespostaUrl"),
    });
    await responderGrd(workspaceId, grdId, session.user.id, input);
  } catch (err) {
    if (err instanceof ApiError) return { status: "error", error: err.message };
    if (err instanceof ZodError) return { status: "error", error: err.issues.map((i) => i.message).join("; ") };
    throw err;
  }

  revalidatePath(`/workspaces/${workspaceId}/grds/${grdId}`);
  return { status: "success" };
}

export async function cancelarGrdAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) return { status: "error", error: "Não autenticado." };

  const workspaceId = String(formData.get("workspaceId") ?? "");
  const grdId = String(formData.get("grdId") ?? "");

  try {
    const grd = await getGrdOrThrow(workspaceId, grdId);
    await requireObraAccess(session.user.id, workspaceId, grd.obraId);
    await cancelarGrd(workspaceId, grdId, session.user.id);
  } catch (err) {
    if (err instanceof ApiError) return { status: "error", error: err.message };
    throw err;
  }

  revalidatePath(`/workspaces/${workspaceId}/grds/${grdId}`);
  return { status: "success" };
}
