"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { ApiError } from "@/lib/errors";
import { requireWorkspaceRole } from "@/services/permissions";
import {
  listarAbasPortifolio,
  parseLinhasPortifolio,
  resumirPorContratoSistema,
  verificarProjetosEObrasExistentes,
  analisarLinhasPortifolio,
  listarVocabularioSecoes,
  listarMembrosWorkspace,
  aplicarSincronizacaoPortifolio,
  type GrupoContratoSistema,
  type LinhaPortifolioParaAplicar,
} from "@/services/sincronizarPortifolioService";

type Resultado<T> = { ok: true; data: T } | { ok: false; error: string };

async function exigirGestor(workspaceId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new ApiError(401, "NAO_AUTENTICADO", "Não autenticado.");
  await requireWorkspaceRole(session.user.id, workspaceId, ["administrador", "coordenador"]);
  return session.user.id;
}

export async function listarAbasPortfolioAction(workspaceId: string, arquivoBase64: string): Promise<Resultado<string[]>> {
  try {
    await exigirGestor(workspaceId);
    const buffer = Buffer.from(arquivoBase64, "base64");
    const abas = await listarAbasPortifolio(buffer);
    return { ok: true, data: abas };
  } catch (err) {
    if (err instanceof ApiError) return { ok: false, error: err.message };
    throw err;
  }
}

export async function resumirPortfolioAction(
  workspaceId: string,
  arquivoBase64: string,
  sheetName: string
): Promise<Resultado<{ grupos: (GrupoContratoSistema & { projetoExiste: boolean; obraExiste: boolean })[]; totalLinhas: number }>> {
  try {
    await exigirGestor(workspaceId);
    const buffer = Buffer.from(arquivoBase64, "base64");
    const linhas = await parseLinhasPortifolio(buffer, sheetName);
    if (linhas.length === 0) return { ok: false, error: "Não encontrei nenhuma linha válida nessa aba." };
    const grupos = await verificarProjetosEObrasExistentes(workspaceId, resumirPorContratoSistema(linhas));
    return { ok: true, data: { grupos, totalLinhas: linhas.length } };
  } catch (err) {
    if (err instanceof ApiError) return { ok: false, error: err.message };
    throw err;
  }
}

export async function analisarPortfolioAction(
  workspaceId: string,
  arquivoBase64: string,
  sheetName: string,
  gruposSelecionados: { contrato: string; sistema: string }[]
) {
  try {
    await exigirGestor(workspaceId);
    const buffer = Buffer.from(arquivoBase64, "base64");
    const todasAsLinhas = await parseLinhasPortifolio(buffer, sheetName);
    const selecionados = new Set(gruposSelecionados.map((g) => `${g.contrato}|${g.sistema}`));
    const linhas = todasAsLinhas.filter((l) => selecionados.has(`${l.contrato}|${l.sistema}`));
    const [analisadas, vocabularioSecoes, membros] = await Promise.all([
      analisarLinhasPortifolio(workspaceId, linhas),
      listarVocabularioSecoes(workspaceId),
      listarMembrosWorkspace(workspaceId),
    ]);
    return { ok: true as const, data: { linhas: analisadas, vocabularioSecoes, membros } };
  } catch (err) {
    if (err instanceof ApiError) return { ok: false as const, error: err.message };
    throw err;
  }
}

export async function confirmarSincronizacaoPortfolioAction(workspaceId: string, linhas: LinhaPortifolioParaAplicar[]) {
  try {
    const userId = await exigirGestor(workspaceId);
    const resultado = await aplicarSincronizacaoPortifolio(workspaceId, userId, linhas);
    revalidatePath(`/workspaces/${workspaceId}`);
    revalidatePath(`/workspaces/${workspaceId}/projetos`);
    return { ok: true as const, data: resultado };
  } catch (err) {
    if (err instanceof ApiError) return { ok: false as const, error: err.message };
    throw err;
  }
}
