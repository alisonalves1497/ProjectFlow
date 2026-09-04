"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { auth } from "@/auth";
import { ApiError } from "@/lib/errors";
import {
  workspaceMemberAddSchema,
  workspaceMemberEmailUpdateSchema,
  workspaceMemberUpdateSchema,
} from "@/lib/validators";
import {
  addWorkspaceMember,
  removeWorkspaceMember,
  updateWorkspaceMemberRole,
  updateWorkspaceMemberEmail,
} from "@/services/workspaceService";
import { addObraMemberByUserId, removeObraMember, listObraIdsDoMembro } from "@/services/obraService";
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
      nome: formData.get("nome") || undefined,
      senha: formData.get("senha") || undefined,
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

export async function updateMemberEmailAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) return { status: "error", error: "Não autenticado." };

  const workspaceId = String(formData.get("workspaceId") ?? "");
  const userId = String(formData.get("userId") ?? "");

  try {
    await requireWorkspaceRole(session.user.id, workspaceId, ["administrador", "coordenador"]);
    const input = workspaceMemberEmailUpdateSchema.parse({ email: formData.get("email") });
    await updateWorkspaceMemberEmail(workspaceId, userId, input.email);
  } catch (err) {
    if (err instanceof ApiError) return { status: "error", error: err.message };
    if (err instanceof ZodError) return { status: "error", error: err.issues.map((i) => i.message).join("; ") };
    throw err;
  }

  revalidatePath(`/workspaces/${workspaceId}/membros`);
  return { status: "success" };
}

// Salva Papel + Obras liberadas de uma vez só (painel de detalhe do membro) — em vez de uma
// chamada por campo como antes. Papel só muda de verdade se for diferente do atual (e só
// administrador pode mudar papel); Obras são recalculadas por diff contra o que já existe,
// e coordenador só pode mexer nas Obras que ele mesmo já acessa.
export async function updateMemberAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) return { status: "error", error: "Não autenticado." };

  const workspaceId = String(formData.get("workspaceId") ?? "");
  const userId = String(formData.get("userId") ?? "");

  if (session.user.id === userId) {
    return { status: "error", error: "Você não pode alterar seu próprio papel ou acesso por aqui." };
  }

  let atorRole;
  try {
    atorRole = await requireWorkspaceRole(session.user.id, workspaceId, ["administrador", "coordenador"]);
  } catch (err) {
    if (err instanceof ApiError) return { status: "error", error: err.message };
    throw err;
  }

  let input;
  try {
    input = workspaceMemberUpdateSchema.parse({
      role: formData.get("role"),
      obraIds: JSON.parse(String(formData.get("obraIds") ?? "[]")),
    });
  } catch (err) {
    if (err instanceof ZodError) return { status: "error", error: err.issues.map((i) => i.message).join("; ") };
    return { status: "error", error: "Dados inválidos." };
  }

  try {
    const [membroAtual, obraIdsAtuais] = await Promise.all([
      requireWorkspaceRole(userId, workspaceId, ["administrador", "coordenador", "lider_aprovador", "analista"]),
      listObraIdsDoMembro(workspaceId, userId),
    ]);

    if (input.role !== membroAtual) {
      if (atorRole !== "administrador") {
        return { status: "error", error: "Só administrador pode mudar o papel de um membro." };
      }
      await updateWorkspaceMemberRole(workspaceId, userId, input.role);
    }

    // Administrador tem acesso a tudo por papel — as Obras explícitas ficam irrelevantes,
    // então nem vale a pena aplicar o diff (o painel já manda a lista vazia nesse caso).
    if (input.role !== "administrador") {
      const atuaisSet = new Set(obraIdsAtuais);
      const desejadoSet = new Set(input.obraIds);
      const paraAdicionar = input.obraIds.filter((id) => !atuaisSet.has(id));
      const paraRemover = obraIdsAtuais.filter((id) => !desejadoSet.has(id));

      if (atorRole === "coordenador") {
        for (const obraId of [...paraAdicionar, ...paraRemover]) {
          await requireObraAccess(session.user.id, workspaceId, obraId);
        }
      }

      await Promise.all([
        ...paraAdicionar.map((obraId) => addObraMemberByUserId(obraId, userId)),
        ...paraRemover.map((obraId) => removeObraMember(obraId, userId)),
      ]);
    }
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

  if (session.user.id === userId) {
    return { status: "error", error: "Você não pode remover a si mesmo." };
  }

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
