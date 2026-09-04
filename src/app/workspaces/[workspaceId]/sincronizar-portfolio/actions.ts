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

export async function listarAbasPortfolioAction(formData: FormData): Promise<Resultado<string[]>> {
  try {
    const workspaceId = String(formData.get("workspaceId") ?? "");
    await exigirGestor(workspaceId);
    const buffer = await arquivoDoFormData(formData);
    const abas = await listarAbasPortifolio(buffer);
    return { ok: true, data: abas };
  } catch (err) {
    if (err instanceof ApiError) return { ok: false, error: err.message };
    throw err;
  }
}

export async function resumirPortfolioAction(
  formData: FormData
): Promise<Resultado<{ grupos: (GrupoContratoSistema & { projetoExiste: boolean; obraExiste: boolean })[]; totalLinhas: number }>> {
  try {
    const workspaceId = String(formData.get("workspaceId") ?? "");
    const sheetName = String(formData.get("sheetName") ?? "");
    await exigirGestor(workspaceId);
    const buffer = await arquivoDoFormData(formData);
    const linhas = await parseLinhasPortifolio(buffer, sheetName);
    if (linhas.length === 0) return { ok: false, error: "Não encontrei nenhuma linha válida nessa aba." };
    const grupos = await verificarProjetosEObrasExistentes(workspaceId, resumirPorContratoSistema(linhas));
    return { ok: true, data: { grupos, totalLinhas: linhas.length } };
  } catch (err) {
    if (err instanceof ApiError) return { ok: false, error: err.message };
    throw err;
  }
}

export async function analisarPortfolioAction(formData: FormData) {
  try {
    const workspaceId = String(formData.get("workspaceId") ?? "");
    const sheetName = String(formData.get("sheetName") ?? "");
    const gruposSelecionados = JSON.parse(String(formData.get("gruposSelecionados") ?? "[]")) as {
      contrato: string;
      sistema: string;
    }[];
    await exigirGestor(workspaceId);
    const buffer = await arquivoDoFormData(formData);
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
