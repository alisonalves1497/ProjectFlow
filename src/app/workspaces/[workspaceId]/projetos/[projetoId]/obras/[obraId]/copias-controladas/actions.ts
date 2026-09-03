"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { auth } from "@/auth";
import { ApiError } from "@/lib/errors";
import { copiaControladaCreateSchema } from "@/lib/validators";
import { createCopiaControlada, getCopiaControladaOrThrow, trocarCopiaControlada, cancelarCopiaControlada } from "@/services/copiaControladaService";
import { requireObraAccess } from "@/services/permissions";

export type ActionState = { status: "idle" } | { status: "error"; error: string } | { status: "success" };

function copiasPath(workspaceId: string, projetoId: string, obraId: string) {
  return `/workspaces/${workspaceId}/projetos/${projetoId}/obras/${obraId}/copias-controladas`;
}

export async function createCopiaControladaAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
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
    input = copiaControladaCreateSchema.parse({
      documentoId: formData.get("documentoId"),
      detentorId: formData.get("detentorId"),
    });
  } catch (err) {
    if (err instanceof ZodError) return { status: "error", error: err.issues.map((i) => i.message).join("; ") };
    return { status: "error", error: "Dados inválidos." };
  }

  try {
    await createCopiaControlada(workspaceId, session.user.id, input);
  } catch (err) {
    if (err instanceof ApiError) return { status: "error", error: err.message };
    throw err;
  }

  revalidatePath(copiasPath(workspaceId, projetoId, obraId));
  return { status: "success" };
}

export async function trocarCopiaControladaAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) return { status: "error", error: "Não autenticado." };

  const workspaceId = String(formData.get("workspaceId") ?? "");
  const projetoId = String(formData.get("projetoId") ?? "");
  const obraId = String(formData.get("obraId") ?? "");
  const copiaId = String(formData.get("copiaId") ?? "");

  try {
    const copia = await getCopiaControladaOrThrow(workspaceId, copiaId);
    await requireObraAccess(session.user.id, workspaceId, copia.obraId);
    await trocarCopiaControlada(workspaceId, session.user.id, copiaId);
  } catch (err) {
    if (err instanceof ApiError) return { status: "error", error: err.message };
    throw err;
  }

  revalidatePath(copiasPath(workspaceId, projetoId, obraId));
  return { status: "success" };
}

export async function cancelarCopiaControladaAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) return { status: "error", error: "Não autenticado." };

  const workspaceId = String(formData.get("workspaceId") ?? "");
  const projetoId = String(formData.get("projetoId") ?? "");
  const obraId = String(formData.get("obraId") ?? "");
  const copiaId = String(formData.get("copiaId") ?? "");

  try {
    const copia = await getCopiaControladaOrThrow(workspaceId, copiaId);
    await requireObraAccess(session.user.id, workspaceId, copia.obraId);
    await cancelarCopiaControlada(workspaceId, session.user.id, copiaId);
  } catch (err) {
    if (err instanceof ApiError) return { status: "error", error: err.message };
    throw err;
  }

  revalidatePath(copiasPath(workspaceId, projetoId, obraId));
  return { status: "success" };
}
