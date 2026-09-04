"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { ApiError } from "@/lib/errors";
import { requireWorkspaceRole } from "@/services/permissions";
import { createProjeto, getProjetoOrThrow } from "@/services/projetoService";
import { createObra } from "@/services/obraService";
import {
  listarAbasPlanilha,
  parseListaDocumentos,
  sugerirCatalogo,
  sugerirDisciplinaId,
  agruparPorSecao,
  importarDocumentos,
  type LinhaParaImportar,
  type GrupoSecao,
} from "@/services/importDocumentosService";

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

export async function listarAbasAction(formData: FormData): Promise<Resultado<string[]>> {
  try {
    const workspaceId = String(formData.get("workspaceId") ?? "");
    await exigirGestor(workspaceId);
    const buffer = await arquivoDoFormData(formData);
    const abas = await listarAbasPlanilha(buffer);
    return { ok: true, data: abas };
  } catch (err) {
    if (err instanceof ApiError) return { ok: false, error: err.message };
    throw err;
  }
}

export type LinhaComSugestao = {
  linha: number;
  descricao: string;
  disciplinaTexto: string;
  secaoExcel: string;
  disciplinaIdSugerida: string | null;
};

export type CatalogoParaImportacao = {
  disciplinas: { id: string; name: string; code: string }[];
  tipos: { id: string; name: string; code: string }[];
  fases: { id: string; name: string; code: string }[];
};

export async function analisarPlanilhaAction(
  formData: FormData
): Promise<Resultado<{ linhas: LinhaComSugestao[]; grupos: GrupoSecao[]; catalogo: CatalogoParaImportacao }>> {
  try {
    const workspaceId = String(formData.get("workspaceId") ?? "");
    const sheetName = String(formData.get("sheetName") ?? "");
    await exigirGestor(workspaceId);
    const buffer = await arquivoDoFormData(formData);
    const [linhas, catalogo] = await Promise.all([parseListaDocumentos(buffer, sheetName), sugerirCatalogo(workspaceId)]);

    const linhasComSugestao: LinhaComSugestao[] = linhas.map((l) => ({
      ...l,
      disciplinaIdSugerida: sugerirDisciplinaId(l.disciplinaTexto, catalogo.disciplinas),
    }));
    const grupos = agruparPorSecao(linhas, catalogo.tipos);

    return { ok: true, data: { linhas: linhasComSugestao, grupos, catalogo } };
  } catch (err) {
    if (err instanceof ApiError) return { ok: false, error: err.message };
    throw err;
  }
}

export async function criarObraParaImportacaoAction(
  workspaceId: string,
  input: { projetoId: string | null; projetoCode?: string; projetoNome?: string; obraCode: string; obraNome: string }
): Promise<Resultado<{ projetoId: string; obraId: string }>> {
  try {
    const userId = await exigirGestor(workspaceId);

    let projetoId = input.projetoId;
    if (!projetoId) {
      if (!input.projetoCode || !input.projetoNome) {
        return { ok: false, error: "Informe o código e o nome do novo projeto." };
      }
      const projeto = await createProjeto(workspaceId, { code: input.projetoCode, name: input.projetoNome });
      projetoId = projeto.id;
    } else {
      await getProjetoOrThrow(workspaceId, projetoId);
    }

    const obra = await createObra(workspaceId, projetoId, { code: input.obraCode, name: input.obraNome }, userId);
    return { ok: true, data: { projetoId, obraId: obra.id } };
  } catch (err) {
    if (err instanceof ApiError) return { ok: false, error: err.message };
    throw err;
  }
}

export async function confirmarImportacaoAction(
  workspaceId: string,
  obraId: string,
  linhas: LinhaParaImportar[]
): Promise<Resultado<{ criados: number; erros: { descricao: string; erro: string }[] }>> {
  try {
    const userId = await exigirGestor(workspaceId);
    const resultado = await importarDocumentos(workspaceId, userId, obraId, linhas);
    revalidatePath(`/workspaces/${workspaceId}/projetos`);
    return { ok: true, data: resultado };
  } catch (err) {
    if (err instanceof ApiError) return { ok: false, error: err.message };
    throw err;
  }
}
