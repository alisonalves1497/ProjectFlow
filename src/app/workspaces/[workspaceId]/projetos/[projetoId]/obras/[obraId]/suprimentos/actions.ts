"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { auth } from "@/auth";
import { ApiError } from "@/lib/errors";
import { itemSuprimentoCreateSchema, itemSuprimentoUpdateSchema } from "@/lib/validators";
import {
  attachDocumento,
  createItemSuprimento,
  desmarcarComprado,
  detachDocumento,
  marcarComprado,
  updateItemSuprimento,
} from "@/services/itemSuprimentoService";
import { requireObraAccess } from "@/services/permissions";

export type ActionState = { status: "idle" } | { status: "error"; error: string } | { status: "success" };

function itensPath(workspaceId: string, projetoId: string, obraId: string) {
  return `/workspaces/${workspaceId}/projetos/${projetoId}/obras/${obraId}/suprimentos/itens`;
}

export async function createItemAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
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
    input = itemSuprimentoCreateSchema.parse({
      obraId,
      disciplinaId: formData.get("disciplinaId"),
      codigo: formData.get("codigo") || undefined,
      categoria: formData.get("categoria") || undefined,
      nome: formData.get("nome"),
      quantidade: formData.get("quantidade"),
      unidadeMedida: formData.get("unidadeMedida"),
      valorUnitario: formData.get("valorUnitario"),
      fornecedorId: formData.get("fornecedorId") || undefined,
      prazoPrevisto: formData.get("prazoPrevisto") || undefined,
      critico: formData.get("critico") === "on",
      numeroPedidoCompra: formData.get("numeroPedidoCompra") || undefined,
      documentoIds: formData.getAll("documentoIds"),
    });
  } catch (err) {
    if (err instanceof ZodError) return { status: "error", error: err.issues.map((i) => i.message).join("; ") };
    return { status: "error", error: "Dados inválidos." };
  }

  try {
    await createItemSuprimento(workspaceId, session.user.id, input);
  } catch (err) {
    if (err instanceof ApiError) return { status: "error", error: err.message };
    throw err;
  }

  revalidatePath(itensPath(workspaceId, projetoId, obraId));
  return { status: "success" };
}

export async function updateItemAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) return { status: "error", error: "Não autenticado." };

  const workspaceId = String(formData.get("workspaceId") ?? "");
  const projetoId = String(formData.get("projetoId") ?? "");
  const obraId = String(formData.get("obraId") ?? "");
  const itemId = String(formData.get("itemId") ?? "");

  try {
    await requireObraAccess(session.user.id, workspaceId, obraId);
  } catch (err) {
    if (err instanceof ApiError) return { status: "error", error: err.message };
    throw err;
  }

  let input;
  try {
    input = itemSuprimentoUpdateSchema.parse({
      disciplinaId: formData.get("disciplinaId") || undefined,
      codigo: formData.get("codigo") || null,
      categoria: formData.get("categoria") || null,
      nome: formData.get("nome") || undefined,
      quantidade: formData.get("quantidade") || undefined,
      unidadeMedida: formData.get("unidadeMedida") || undefined,
      valorUnitario: formData.get("valorUnitario") || undefined,
      fornecedorId: formData.get("fornecedorId") || null,
      prazoPrevisto: formData.get("prazoPrevisto") || null,
      critico: formData.get("critico") === "on",
      numeroPedidoCompra: formData.get("numeroPedidoCompra") || null,
    });
  } catch (err) {
    if (err instanceof ZodError) return { status: "error", error: err.issues.map((i) => i.message).join("; ") };
    return { status: "error", error: "Dados inválidos." };
  }

  try {
    await updateItemSuprimento(workspaceId, itemId, input);
  } catch (err) {
    if (err instanceof ApiError) return { status: "error", error: err.message };
    throw err;
  }

  revalidatePath(itensPath(workspaceId, projetoId, obraId));
  return { status: "success" };
}

export async function marcarCompradoAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) return { status: "error", error: "Não autenticado." };

  const workspaceId = String(formData.get("workspaceId") ?? "");
  const projetoId = String(formData.get("projetoId") ?? "");
  const obraId = String(formData.get("obraId") ?? "");
  const itemId = String(formData.get("itemId") ?? "");

  try {
    await requireObraAccess(session.user.id, workspaceId, obraId);
    await marcarComprado(workspaceId, itemId);
  } catch (err) {
    if (err instanceof ApiError) return { status: "error", error: err.message };
    throw err;
  }

  revalidatePath(itensPath(workspaceId, projetoId, obraId));
  return { status: "success" };
}

export async function desmarcarCompradoAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) return { status: "error", error: "Não autenticado." };

  const workspaceId = String(formData.get("workspaceId") ?? "");
  const projetoId = String(formData.get("projetoId") ?? "");
  const obraId = String(formData.get("obraId") ?? "");
  const itemId = String(formData.get("itemId") ?? "");

  try {
    await requireObraAccess(session.user.id, workspaceId, obraId);
    await desmarcarComprado(workspaceId, itemId);
  } catch (err) {
    if (err instanceof ApiError) return { status: "error", error: err.message };
    throw err;
  }

  revalidatePath(itensPath(workspaceId, projetoId, obraId));
  return { status: "success" };
}

export async function attachDocumentoAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) return { status: "error", error: "Não autenticado." };

  const workspaceId = String(formData.get("workspaceId") ?? "");
  const projetoId = String(formData.get("projetoId") ?? "");
  const obraId = String(formData.get("obraId") ?? "");
  const itemId = String(formData.get("itemId") ?? "");
  const documentoId = String(formData.get("documentoId") ?? "");

  try {
    await requireObraAccess(session.user.id, workspaceId, obraId);
    await attachDocumento(workspaceId, itemId, documentoId);
  } catch (err) {
    if (err instanceof ApiError) return { status: "error", error: err.message };
    throw err;
  }

  revalidatePath(itensPath(workspaceId, projetoId, obraId));
  return { status: "success" };
}

export async function detachDocumentoAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) return { status: "error", error: "Não autenticado." };

  const workspaceId = String(formData.get("workspaceId") ?? "");
  const projetoId = String(formData.get("projetoId") ?? "");
  const obraId = String(formData.get("obraId") ?? "");
  const itemId = String(formData.get("itemId") ?? "");
  const documentoId = String(formData.get("documentoId") ?? "");

  try {
    await requireObraAccess(session.user.id, workspaceId, obraId);
    await detachDocumento(workspaceId, itemId, documentoId);
  } catch (err) {
    if (err instanceof ApiError) return { status: "error", error: err.message };
    throw err;
  }

  revalidatePath(itensPath(workspaceId, projetoId, obraId));
  return { status: "success" };
}
