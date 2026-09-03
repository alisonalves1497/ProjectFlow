"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { ApiError } from "@/lib/errors";
import { restoreProjeto } from "@/services/projetoService";
import { restoreObra } from "@/services/obraService";
import { requireWorkspaceRole, requireObraAccess, getWorkspaceRole } from "@/services/permissions";

export type ActionState = { status: "idle" } | { status: "error"; error: string } | { status: "success" };

export async function restoreProjetoAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) return { status: "error", error: "Não autenticado." };

  const workspaceId = String(formData.get("workspaceId") ?? "");
  const projetoId = String(formData.get("projetoId") ?? "");

  try {
    await requireWorkspaceRole(session.user.id, workspaceId, ["administrador", "coordenador"]);
    await restoreProjeto(workspaceId, projetoId);
  } catch (err) {
    if (err instanceof ApiError) return { status: "error", error: err.message };
    throw err;
  }

  revalidatePath(`/workspaces/${workspaceId}/lixeira`);
  revalidatePath(`/workspaces/${workspaceId}/projetos`);
  return { status: "success" };
}

export async function restoreObraAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) return { status: "error", error: "Não autenticado." };

  const workspaceId = String(formData.get("workspaceId") ?? "");
  const obraId = String(formData.get("obraId") ?? "");
  const projetoId = String(formData.get("projetoId") ?? "");

  try {
    await requireWorkspaceRole(session.user.id, workspaceId, ["administrador", "coordenador"]);
    // Obra excluída ainda mantém as linhas de obra_members — só administrador ou quem
    // já tinha acesso a ela pode restaurar (mesma regra de quem podia excluir).
    const role = await getWorkspaceRole(session.user.id, workspaceId);
    if (role !== "administrador") await requireObraAccess(session.user.id, workspaceId, obraId);
    await restoreObra(workspaceId, obraId);
  } catch (err) {
    if (err instanceof ApiError) return { status: "error", error: err.message };
    throw err;
  }

  revalidatePath(`/workspaces/${workspaceId}/lixeira`);
  revalidatePath(`/workspaces/${workspaceId}/projetos/${projetoId}`);
  return { status: "success" };
}
