"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { ApiError } from "@/lib/errors";
import { requireWorkspaceRole, requireObraAccess } from "@/services/permissions";
import {
  listarAbasPlanilhaGed,
  parseLinhasGed,
  analisarLinhasGed,
  aplicarSincronizacaoGed,
  garantirObraDisciplina,
  type LinhaGedParaAplicar,
} from "@/services/sincronizarGedService";
import { listDisciplinasComSecoesPorObra } from "@/services/catalogoService";

type Resultado<T> = { ok: true; data: T } | { ok: false; error: string };

async function exigirGestor(workspaceId: string, obraId?: string) {
  const session = await auth();
  if (!session?.user?.id) throw new ApiError(401, "NAO_AUTENTICADO", "Não autenticado.");
  await requireWorkspaceRole(session.user.id, workspaceId, ["administrador", "coordenador"]);
  if (obraId) await requireObraAccess(session.user.id, workspaceId, obraId);
  return session.user.id;
}

export async function listarAbasGedAction(workspaceId: string, arquivoBase64: string): Promise<Resultado<string[]>> {
  try {
    await exigirGestor(workspaceId);
    const buffer = Buffer.from(arquivoBase64, "base64");
    const abas = await listarAbasPlanilhaGed(buffer);
    return { ok: true, data: abas };
  } catch (err) {
    if (err instanceof ApiError) return { ok: false, error: err.message };
    throw err;
  }
}

export async function analisarPlanilhaGedAction(
  workspaceId: string,
  obraId: string,
  disciplinaId: string,
  arquivoBase64: string,
  sheetName: string
) {
  try {
    await exigirGestor(workspaceId, obraId);
    const buffer = Buffer.from(arquivoBase64, "base64");
    const linhas = await parseLinhasGed(buffer, sheetName);
    const analisadas = await analisarLinhasGed(workspaceId, obraId, disciplinaId, linhas);
    const disciplinas = await listDisciplinasComSecoesPorObra(obraId);
    const secoesDaDisciplina = disciplinas.find((d) => d.disciplinaId === disciplinaId)?.secoes ?? [];
    return { ok: true as const, data: { linhas: analisadas, secoesDaDisciplina } };
  } catch (err) {
    if (err instanceof ApiError) return { ok: false as const, error: err.message };
    throw err;
  }
}

export async function confirmarSincronizacaoGedAction(
  workspaceId: string,
  obraId: string,
  disciplinaId: string,
  faseId: string,
  linhas: LinhaGedParaAplicar[]
) {
  try {
    const userId = await exigirGestor(workspaceId, obraId);
    // Garante que a combinação obra+disciplina existe antes de criar Documento nela (obra
    // pode nunca ter tido essa disciplina vinculada ainda).
    await garantirObraDisciplina(obraId, disciplinaId);

    const resultado = await aplicarSincronizacaoGed(workspaceId, userId, obraId, disciplinaId, faseId, linhas);
    revalidatePath(`/workspaces/${workspaceId}/projetos`);
    return { ok: true as const, data: resultado };
  } catch (err) {
    if (err instanceof ApiError) return { ok: false as const, error: err.message };
    throw err;
  }
}
