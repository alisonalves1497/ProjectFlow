"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { auth } from "@/auth";
import { ApiError } from "@/lib/errors";
import { projetoCreateSchema } from "@/lib/validators";
import { createProjeto, softDeleteProjeto } from "@/services/projetoService";
import { requireWorkspaceRole } from "@/services/permissions";

export type ActionState = { status: "idle" } | { status: "error"; error: string } | { status: "success" };

export async function createProjetoAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) return { status: "error", error: "Não autenticado." };

  const workspaceId = String(formData.get("workspaceId") ?? "");

  try {
    await requireWorkspaceRole(session.user.id, workspaceId, ["administrador", "coordenador"]);
  } catch (err) {
    if (err instanceof ApiError) return { status: "error", error: err.message };
    throw err;
  }

  let input;
  try {
    input = projetoCreateSchema.parse({
      code: formData.get("code"),
      name: formData.get("name"),
    });
  } catch (err) {
    if (err instanceof ZodError) return { status: "error", error: err.issues.map((i) => i.message).join("; ") };
    return { status: "error", error: "Dados inválidos." };
  }

  try {
    await createProjeto(workspaceId, input);
  } catch (err) {
    if (err instanceof ApiError) return { status: "error", error: err.message };
    throw err;
  }

  revalidatePath(`/workspaces/${workspaceId}/projetos`);
  return { status: "success" };
}

export async function deleteProjetoAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) return { status: "error", error: "Não autenticado." };

  const workspaceId = String(formData.get("workspaceId") ?? "");
  const projetoId = String(formData.get("projetoId") ?? "");

  try {
    await requireWorkspaceRole(session.user.id, workspaceId, ["administrador", "coordenador"]);
    await softDeleteProjeto(workspaceId, projetoId);
  } catch (err) {
    if (err instanceof ApiError) return { status: "error", error: err.message };
    throw err;
  }

  revalidatePath(`/workspaces/${workspaceId}/projetos`);
  return { status: "success" };
}
