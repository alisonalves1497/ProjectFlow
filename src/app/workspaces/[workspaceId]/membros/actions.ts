"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { auth } from "@/auth";
import { ApiError } from "@/lib/errors";
import { workspaceMemberAddSchema, workspaceMemberRoleUpdateSchema } from "@/lib/validators";
import { addWorkspaceMember, removeWorkspaceMember, updateWorkspaceMemberRole } from "@/services/workspaceService";
import { addObraMemberByUserId, removeObraMember } from "@/services/obraService";
import { requireWorkspaceRole, requireObraAccess } from "@/services/permissions";

export type ActionState = { status: "idle" } | { status: "error"; error: string } | { status: "success" };

export async function addMemberAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
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
    input = workspaceMemberAddSchema.parse({
      email: formData.get("email"),
      role: formData.get("role"),
    });
  } catch (err) {
    if (err instanceof ZodError) return { status: "error", error: err.issues.map((i) => i.message).join("; ") };
    return { status: "error", error: "Dados inválidos." };
  }

  try {
    await addWorkspaceMember(workspaceId, input);
  } catch (err) {
    if (err instanceof ApiError) return { status: "error", error: err.message };
    throw err;
  }

  revalidatePath(`/workspaces/${workspaceId}/membros`);
  return { status: "success" };
}

export async function updateMemberRoleAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) return { status: "error", error: "Não autenticado." };

  const workspaceId = String(formData.get("workspaceId") ?? "");
  const userId = String(formData.get("userId") ?? "");

  try {
    await requireWorkspaceRole(session.user.id, workspaceId, ["administrador"]);
    const input = workspaceMemberRoleUpdateSchema.parse({ role: formData.get("role") });
    await updateWorkspaceMemberRole(workspaceId, userId, input.role);
  } catch (err) {
    if (err instanceof ApiError) return { status: "error", error: err.message };
    if (err instanceof ZodError) return { status: "error", error: "Papel inválido." };
    throw err;
  }

  revalidatePath(`/workspaces/${workspaceId}/membros`);
  return { status: "success" };
}

export async function toggleObraAccessAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) return { status: "error", error: "Não autenticado." };

  const workspaceId = String(formData.get("workspaceId") ?? "");
  const obraId = String(formData.get("obraId") ?? "");
  const targetUserId = String(formData.get("targetUserId") ?? "");
  const grant = formData.get("grant") === "1";

  try {
    await requireWorkspaceRole(session.user.id, workspaceId, ["administrador", "coordenador"]);
    // coordenador só concede/revoga acesso a Obras que ele próprio já acessa.
    await requireObraAccess(session.user.id, workspaceId, obraId);
    if (grant) await addObraMemberByUserId(obraId, targetUserId);
    else await removeObraMember(obraId, targetUserId);
  } catch (err) {
    if (err instanceof ApiError) return { status: "error", error: err.message };
    throw err;
  }

  revalidatePath(`/workspaces/${workspaceId}/membros`);
  return { status: "success" };
}

export async function removeMemberAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) return { status: "error", error: "Não autenticado." };

  const workspaceId = String(formData.get("workspaceId") ?? "");
  const userId = String(formData.get("userId") ?? "");

  try {
    await requireWorkspaceRole(session.user.id, workspaceId, ["administrador", "coordenador"]);
    await removeWorkspaceMember(workspaceId, userId);
  } catch (err) {
    if (err instanceof ApiError) return { status: "error", error: err.message };
    throw err;
  }

  revalidatePath(`/workspaces/${workspaceId}/membros`);
  return { status: "success" };
}
