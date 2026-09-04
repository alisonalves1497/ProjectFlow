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

// O arquivo vem dentro de um FormData (campo "arquivo", um File de verdade) em vez de uma
// string base64 solta como argumento — Server Action com string muito longa esbarra num
// limite de segurança do React ("Maximum array nesting exceeded", a partir de ~1-2MB de
// string), independente do bodySizeLimit configurado. FormData com File é o jeito nativo
// do Next pra isso: manda os bytes direto, sem inflar 33% em base64 nem cair nesse limite.
async function arquivoDoFormData(formData: FormData): Promise<Buffer> {
  const arquivo = formData.get("arquivo");
  if (!(arquivo instanceof File)) throw new ApiError(400, "ARQUIVO_AUSENTE", "Nenhum arquivo enviado.");
  return Buffer.from(await arquivo.arrayBuffer());
}

export async function listarAbasGedAction(formData: FormData): Promise<Resultado<string[]>> {
  try {
    const workspaceId = String(formData.get("workspaceId") ?? "");
    await exigirGestor(workspaceId);
    const buffer = await arquivoDoFormData(formData);
    const abas = await listarAbasPlanilhaGed(buffer);
    return { ok: true, data: abas };
  } catch (err) {
    if (err instanceof ApiError) return { ok: false, error: err.message };
    throw err;
  }
}

export async function analisarPlanilhaGedAction(formData: FormData) {
  try {
    const workspaceId = String(formData.get("workspaceId") ?? "");
    const obraId = String(formData.get("obraId") ?? "");
    const disciplinaId = String(formData.get("disciplinaId") ?? "");
    const sheetName = String(formData.get("sheetName") ?? "");
    await exigirGestor(workspaceId, obraId);
    const buffer = await arquivoDoFormData(formData);
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
