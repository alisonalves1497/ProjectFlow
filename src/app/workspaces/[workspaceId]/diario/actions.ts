"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { ApiError } from "@/lib/errors";
import { createTarefaPessoal, updateTarefaPessoal, deleteTarefaPessoal, type PatchTarefaPessoal, type TarefaPessoal } from "@/services/diarioService";

type Resultado = { ok: true } | { ok: false; error: string };

async function comSessao(workspaceId: string, fn: (userId: string) => Promise<void>): Promise<Resultado> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Não autenticado." };

  try {
    await fn(session.user.id);
  } catch (err) {
    if (err instanceof ApiError) return { ok: false, error: err.message };
    throw err;
  }

  revalidatePath(`/workspaces/${workspaceId}/diario`);
  return { ok: true };
}

export async function criarTarefaAction(workspaceId: string, nome: string): Promise<{ ok: true; tarefa: TarefaPessoal } | { ok: false; error: string }> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Não autenticado." };

  try {
    const tarefa = await createTarefaPessoal(workspaceId, session.user.id, nome);
    revalidatePath(`/workspaces/${workspaceId}/diario`);
    return { ok: true, tarefa: { ...tarefa, projetoNome: null, documentoCodigo: null, documentoStatus: null } };
  } catch (err) {
    if (err instanceof ApiError) return { ok: false, error: err.message };
    throw err;
  }
}

export async function atualizarTarefaAction(workspaceId: string, tarefaId: string, patch: PatchTarefaPessoal): Promise<Resultado> {
  return comSessao(workspaceId, async (userId) => {
    await updateTarefaPessoal(workspaceId, userId, tarefaId, patch);
  });
}

export async function excluirTarefaAction(workspaceId: string, tarefaId: string): Promise<Resultado> {
  return comSessao(workspaceId, async (userId) => {
    await deleteTarefaPessoal(workspaceId, userId, tarefaId);
  });
}
