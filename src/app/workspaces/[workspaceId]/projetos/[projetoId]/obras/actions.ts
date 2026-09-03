"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { auth } from "@/auth";
import { ApiError } from "@/lib/errors";
import { obraCreateSchema, obraMemberAddSchema, obraUpdateSchema } from "@/lib/validators";
import { addObraMember, createObra, removeObraMember, softDeleteObra, updateObra } from "@/services/obraService";
import { requireWorkspaceRole, requireObraAccess } from "@/services/permissions";

export type ActionState = { status: "idle" } | { status: "error"; error: string } | { status: "success" };

export async function createObraAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) return { status: "error", error: "Não autenticado." };

  const workspaceId = String(formData.get("workspaceId") ?? "");
  const projetoId = String(formData.get("projetoId") ?? "");

  try {
    await requireWorkspaceRole(session.user.id, workspaceId, ["administrador", "coordenador"]);
  } catch (err) {
    if (err instanceof ApiError) return { status: "error", error: err.message };
    throw err;
  }

  let input;
  try {
    input = obraCreateSchema.parse({
      code: formData.get("code"),
      name: formData.get("name"),
    });
  } catch (err) {
    if (err instanceof ZodError) return { status: "error", error: err.issues.map((i) => i.message).join("; ") };
    return { status: "error", error: "Dados inválidos." };
  }

  try {
    await createObra(workspaceId, projetoId, input, session.user.id);
  } catch (err) {
    if (err instanceof ApiError) return { status: "error", error: err.message };
    throw err;
  }

  revalidatePath(`/workspaces/${workspaceId}/projetos/${projetoId}`);
  return { status: "success" };
}

export async function renameObraAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) return { status: "error", error: "Não autenticado." };

  const workspaceId = String(formData.get("workspaceId") ?? "");
  const projetoId = String(formData.get("projetoId") ?? "");
  const obraId = String(formData.get("obraId") ?? "");

  try {
    await requireWorkspaceRole(session.user.id, workspaceId, ["administrador", "coordenador"]);
    await requireObraAccess(session.user.id, workspaceId, obraId);
    const input = obraUpdateSchema.parse({ name: formData.get("name") });
    await updateObra(workspaceId, obraId, input);
  } catch (err) {
    if (err instanceof ApiError) return { status: "error", error: err.message };
    if (err instanceof ZodError) return { status: "error", error: err.issues.map((i) => i.message).join("; ") };
    throw err;
  }

  revalidatePath(`/workspaces/${workspaceId}`, "layout");
  return { status: "success" };
}

export async function deleteObraAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) return { status: "error", error: "Não autenticado." };

  const workspaceId = String(formData.get("workspaceId") ?? "");
  const projetoId = String(formData.get("projetoId") ?? "");
  const obraId = String(formData.get("obraId") ?? "");

  try {
    await requireWorkspaceRole(session.user.id, workspaceId, ["administrador", "coordenador"]);
    await requireObraAccess(session.user.id, workspaceId, obraId);
    await softDeleteObra(workspaceId, obraId);
  } catch (err) {
    if (err instanceof ApiError) return { status: "error", error: err.message };
    throw err;
  }

  revalidatePath(`/workspaces/${workspaceId}/projetos/${projetoId}`);
  return { status: "success" };
}

export async function addObraMemberAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) return { status: "error", error: "Não autenticado." };

  const workspaceId = String(formData.get("workspaceId") ?? "");
  const projetoId = String(formData.get("projetoId") ?? "");
  const obraId = String(formData.get("obraId") ?? "");

  try {
    await requireWorkspaceRole(session.user.id, workspaceId, ["administrador", "coordenador"]);
    await requireObraAccess(session.user.id, workspaceId, obraId);
  } catch (err) {
    if (err instanceof ApiError) return { status: "error", error: err.message };
    throw err;
  }

  let input;
  try {
    input = obraMemberAddSchema.parse({ email: formData.get("email") });
  } catch (err) {
    if (err instanceof ZodError) return { status: "error", error: err.issues.map((i) => i.message).join("; ") };
    return { status: "error", error: "Dados inválidos." };
  }

  try {
    await addObraMember(obraId, input.email);
  } catch (err) {
    if (err instanceof ApiError) return { status: "error", error: err.message };
    throw err;
  }

  revalidatePath(`/workspaces/${workspaceId}/projetos/${projetoId}/obras/${obraId}`);
  return { status: "success" };
}

export async function removeObraMemberAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) return { status: "error", error: "Não autenticado." };

  const workspaceId = String(formData.get("workspaceId") ?? "");
  const projetoId = String(formData.get("projetoId") ?? "");
  const obraId = String(formData.get("obraId") ?? "");
  const userId = String(formData.get("userId") ?? "");

  try {
    await requireWorkspaceRole(session.user.id, workspaceId, ["administrador", "coordenador"]);
    await requireObraAccess(session.user.id, workspaceId, obraId);
    await removeObraMember(obraId, userId);
  } catch (err) {
    if (err instanceof ApiError) return { status: "error", error: err.message };
    throw err;
  }

  revalidatePath(`/workspaces/${workspaceId}/projetos/${projetoId}/obras/${obraId}`);
  return { status: "success" };
}
