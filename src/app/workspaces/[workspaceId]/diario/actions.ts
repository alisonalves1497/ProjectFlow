"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { ApiError } from "@/lib/errors";
import { requireWorkspaceRole } from "@/services/permissions";
import {
  createTarefaPessoal,
  updateTarefaPessoal,
  updateTarefaPessoalAdmin,
  deleteTarefaPessoal,
  deleteTarefaPessoalAdmin,
  listTarefasPessoais,
  listTarefasAtribuidasPorMim,
  type PatchTarefaPessoal,
  type TarefaPessoal,
} from "@/services/diarioService";

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

export async function criarTarefaAction(
  workspaceId: string,
  nome: string,
  responsavelId?: string
): Promise<{ ok: true; tarefa: TarefaPessoal } | { ok: false; error: string }> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Não autenticado." };

  try {
    const tarefa = await createTarefaPessoal(workspaceId, session.user.id, nome, responsavelId);
    revalidatePath(`/workspaces/${workspaceId}/diario`);
    return {
      ok: true,
      tarefa: {
        ...tarefa,
        projetoNome: null,
        documentoCodigo: null,
        // Quem acabou de criar É o criador, então essa marcação nunca aparece pra ele mesmo
        // (só faz sentido quando QUEM VÊ a tarefa não foi quem criou — ver listTarefasPessoais).
        criadoPorNome: null,
        donoId: tarefa.userId,
        // Preenchido no cliente (lista-pessoal.tsx) quando a tarefa é atribuída a outra
        // pessoa — aqui no servidor não vale a pena buscar o nome só pra isso.
        donoNome: null,
      },
    };
  } catch (err) {
    if (err instanceof ApiError) return { ok: false, error: err.message };
    throw err;
  }
}

// `comoAdmin` só é honrado depois de confirmar o role no servidor — nunca confia no que o
// cliente manda sozinho (poderia forjar o flag). Sem isso, cai no caminho normal (dono/criador).
export async function atualizarTarefaAction(workspaceId: string, tarefaId: string, patch: PatchTarefaPessoal, comoAdmin?: boolean): Promise<Resultado> {
  return comSessao(workspaceId, async (userId) => {
    if (comoAdmin) {
      await requireWorkspaceRole(userId, workspaceId, ["administrador"]);
      await updateTarefaPessoalAdmin(workspaceId, tarefaId, patch);
      return;
    }
    await updateTarefaPessoal(workspaceId, userId, tarefaId, patch);
  });
}

export async function excluirTarefaAction(workspaceId: string, tarefaId: string, comoAdmin?: boolean): Promise<Resultado> {
  return comSessao(workspaceId, async (userId) => {
    if (comoAdmin) {
      await requireWorkspaceRole(userId, workspaceId, ["administrador"]);
      await deleteTarefaPessoalAdmin(workspaceId, tarefaId);
      return;
    }
    await deleteTarefaPessoal(workspaceId, userId, tarefaId);
  });
}

// Busca a Lista pessoal completa de outro membro — só pra administrador (checado aqui, não no
// cliente). Usada pelo seletor "ver lista de" no cabeçalho da Lista pessoal.
export async function listarListaPessoalDeAction(
  workspaceId: string,
  membroId: string
): Promise<{ ok: true; tarefas: TarefaPessoal[] } | { ok: false; error: string }> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Não autenticado." };

  try {
    await requireWorkspaceRole(session.user.id, workspaceId, ["administrador"]);
    const [proprias, atribuidas] = await Promise.all([
      listTarefasPessoais(workspaceId, membroId),
      listTarefasAtribuidasPorMim(workspaceId, membroId),
    ]);
    const tarefas = [...proprias, ...atribuidas].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return { ok: true, tarefas };
  } catch (err) {
    if (err instanceof ApiError) return { ok: false, error: err.message };
    throw err;
  }
}
