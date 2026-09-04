"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { auth } from "@/auth";
import { ApiError } from "@/lib/errors";
import {
  documentoCreateSchema,
  documentoUpdateSchema,
  transicaoStatusSchema,
  comentarioCreateSchema,
  revisaoCreateSchema,
  documentoBulkMoverSchema,
  documentoBulkAtribuirSchema,
  documentoBulkReprogramarSchema,
  documentoBulkExcluirSchema,
  secaoRenameSchema,
  setStatusDiretoSchema,
} from "@/lib/validators";
import {
  createDocumento,
  updateDocumento,
  getDocumentoOrThrow,
  bulkMoverSecao,
  bulkAtribuir,
  bulkReprogramar,
  bulkSoftDeleteDocumentos,
  setStatusDireto,
} from "@/services/documentoService";
import { createRevisao, transitionRevisaoStatus, toggleConferido, setArquivoRevisao } from "@/services/revisaoService";
import { createComentario } from "@/services/comentarioService";
import { toggleFavorito } from "@/services/favoritoService";
import { createAnexoRevisao, deleteAnexo } from "@/services/anexoService";
import { renomearSecao, getSecaoPadraoOrThrow, contarSecoesDaObraDisciplina } from "@/services/catalogoService";
import { garantirObraDisciplina, garantirSecaoPorTipo } from "@/services/importDocumentosService";
import { requireObraAccess, requireWorkspaceRole } from "@/services/permissions";

// Prefixo usado pelo <select> de Seção em "Novo documento" pra distinguir uma Seção real
// (id de verdade) de um nome sugerido do catálogo (ver secoesPadrao) que ainda não foi usado
// nesta Obra — nesse caso materializa a Seção de verdade na hora, sob demanda.
const PREFIXO_SECAO_PADRAO = "padrao:";

export type ActionState = { status: "idle" } | { status: "error"; error: string } | { status: "success" };

function obraDocumentosPath(workspaceId: string, projetoId: string, obraId: string) {
  return `/workspaces/${workspaceId}/projetos/${projetoId}/obras/${obraId}`;
}

export async function createDocumentoAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
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
    input = documentoCreateSchema.parse({
      obraId,
      disciplinaId: formData.get("disciplinaId"),
      secaoId: formData.get("secaoId"),
      faseId: formData.get("faseId"),
      tipoDocumentoId: formData.get("tipoDocumentoId"),
      descricao: formData.get("descricao"),
      dataBaseline: formData.get("dataBaseline") || undefined,
      dataPrevista: formData.get("dataPrevista") || undefined,
    });
  } catch (err) {
    if (err instanceof ZodError) return { status: "error", error: err.issues.map((i) => i.message).join("; ") };
    return { status: "error", error: "Dados inválidos." };
  }

  try {
    if (input.secaoId.startsWith(PREFIXO_SECAO_PADRAO)) {
      const secaoPadraoId = input.secaoId.slice(PREFIXO_SECAO_PADRAO.length);
      const secaoPadrao = await getSecaoPadraoOrThrow(workspaceId, secaoPadraoId);
      const od = await garantirObraDisciplina(obraId, input.disciplinaId);
      const posicao = (await contarSecoesDaObraDisciplina(od.id)) + 1;
      const secao = await garantirSecaoPorTipo(od.id, secaoPadrao.name, posicao);
      input.secaoId = secao.id;
    }
    await createDocumento(workspaceId, session.user.id, input);
  } catch (err) {
    if (err instanceof ApiError) return { status: "error", error: err.message };
    throw err;
  }

  revalidatePath(obraDocumentosPath(workspaceId, projetoId, obraId));
  return { status: "success" };
}

export async function bulkMoverSecaoAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) return { status: "error", error: "Não autenticado." };

  const workspaceId = String(formData.get("workspaceId") ?? "");
  const projetoId = String(formData.get("projetoId") ?? "");
  const obraId = String(formData.get("obraId") ?? "");

  try {
    await requireObraAccess(session.user.id, workspaceId, obraId);
    const input = documentoBulkMoverSchema.parse({
      documentoIds: formData.getAll("documentoIds"),
      secaoId: formData.get("secaoId"),
    });
    await bulkMoverSecao(workspaceId, obraId, input.documentoIds, input.secaoId);
  } catch (err) {
    if (err instanceof ApiError) return { status: "error", error: err.message };
    if (err instanceof ZodError) return { status: "error", error: err.issues.map((i) => i.message).join("; ") };
    throw err;
  }

  revalidatePath(obraDocumentosPath(workspaceId, projetoId, obraId));
  return { status: "success" };
}

export async function bulkAtribuirAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) return { status: "error", error: "Não autenticado." };

  const workspaceId = String(formData.get("workspaceId") ?? "");
  const projetoId = String(formData.get("projetoId") ?? "");
  const obraId = String(formData.get("obraId") ?? "");

  try {
    await requireObraAccess(session.user.id, workspaceId, obraId);
    const input = documentoBulkAtribuirSchema.parse({
      documentoIds: formData.getAll("documentoIds"),
      responsavelId: formData.get("responsavelId"),
    });
    await bulkAtribuir(workspaceId, obraId, input.documentoIds, input.responsavelId);
  } catch (err) {
    if (err instanceof ApiError) return { status: "error", error: err.message };
    if (err instanceof ZodError) return { status: "error", error: err.issues.map((i) => i.message).join("; ") };
    throw err;
  }

  revalidatePath(obraDocumentosPath(workspaceId, projetoId, obraId));
  return { status: "success" };
}

export async function bulkReprogramarAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) return { status: "error", error: "Não autenticado." };

  const workspaceId = String(formData.get("workspaceId") ?? "");
  const projetoId = String(formData.get("projetoId") ?? "");
  const obraId = String(formData.get("obraId") ?? "");

  try {
    await requireObraAccess(session.user.id, workspaceId, obraId);
    const input = documentoBulkReprogramarSchema.parse({
      documentoIds: formData.getAll("documentoIds"),
      dataReprogramada: formData.get("dataReprogramada"),
    });
    await bulkReprogramar(workspaceId, obraId, input.documentoIds, input.dataReprogramada);
  } catch (err) {
    if (err instanceof ApiError) return { status: "error", error: err.message };
    if (err instanceof ZodError) return { status: "error", error: err.issues.map((i) => i.message).join("; ") };
    throw err;
  }

  revalidatePath(obraDocumentosPath(workspaceId, projetoId, obraId));
  return { status: "success" };
}

export async function bulkExcluirAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) return { status: "error", error: "Não autenticado." };

  const workspaceId = String(formData.get("workspaceId") ?? "");
  const projetoId = String(formData.get("projetoId") ?? "");
  const obraId = String(formData.get("obraId") ?? "");

  try {
    // Excluir é mais destrutivo que mover/atribuir/reprogramar — exige administrador/coordenador
    // do workspace, mesmo nível já usado pra excluir uma Obra ou Projeto inteiro.
    await requireWorkspaceRole(session.user.id, workspaceId, ["administrador", "coordenador"]);
    await requireObraAccess(session.user.id, workspaceId, obraId);
    const input = documentoBulkExcluirSchema.parse({ documentoIds: formData.getAll("documentoIds") });
    await bulkSoftDeleteDocumentos(workspaceId, obraId, input.documentoIds);
  } catch (err) {
    if (err instanceof ApiError) return { status: "error", error: err.message };
    if (err instanceof ZodError) return { status: "error", error: err.issues.map((i) => i.message).join("; ") };
    throw err;
  }

  revalidatePath(obraDocumentosPath(workspaceId, projetoId, obraId));
  return { status: "success" };
}

export async function renomearSecaoAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) return { status: "error", error: "Não autenticado." };

  const workspaceId = String(formData.get("workspaceId") ?? "");
  const projetoId = String(formData.get("projetoId") ?? "");
  const obraId = String(formData.get("obraId") ?? "");
  const secaoId = String(formData.get("secaoId") ?? "");

  try {
    // Mesmo nível de permissão do renomear Projeto/Obra — a Seção é catálogo compartilhado
    // por todos os documentos dela, não é um ajuste cosmético de um documento só.
    await requireWorkspaceRole(session.user.id, workspaceId, ["administrador", "coordenador"]);
    await requireObraAccess(session.user.id, workspaceId, obraId);
    const input = secaoRenameSchema.parse({ name: formData.get("name") });
    await renomearSecao(obraId, secaoId, input.name);
  } catch (err) {
    if (err instanceof ApiError) return { status: "error", error: err.message };
    if (err instanceof ZodError) return { status: "error", error: err.issues.map((i) => i.message).join("; ") };
    throw err;
  }

  revalidatePath(obraDocumentosPath(workspaceId, projetoId, obraId));
  return { status: "success" };
}

// Ação direta (sem FormData/ActionState) — chamada via onClick com useTransition,
// pra favoritar/desfavoritar sem recarregar a lista inteira. Retorna o novo estado.
export async function toggleFavoritoAction(workspaceId: string, documentoId: string): Promise<boolean> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Não autenticado.");
  await assertObraAccessForDocumento(session.user.id, workspaceId, documentoId);
  return toggleFavorito(session.user.id, documentoId);
}

async function assertObraAccessForDocumento(userId: string, workspaceId: string, documentoId: string) {
  const documento = await getDocumentoOrThrow(workspaceId, documentoId);
  await requireObraAccess(userId, workspaceId, documento.obraId);
  return documento;
}

export async function updateDocumentoAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) return { status: "error", error: "Não autenticado." };

  const workspaceId = String(formData.get("workspaceId") ?? "");
  const documentoId = String(formData.get("documentoId") ?? "");

  try {
    await assertObraAccessForDocumento(session.user.id, workspaceId, documentoId);

    const responsavelIdRaw = formData.get("responsavelId");
    const input = documentoUpdateSchema.parse({
      descricao: formData.get("descricao") || undefined,
      codigoCompleto: formData.get("codigoCompleto") || undefined,
      secaoId: formData.get("secaoId") || undefined,
      dataBaseline: formData.get("dataBaseline") || null,
      dataReprogramada: formData.get("dataReprogramada") || null,
      // "" no select significa "sem responsável" — precisa virar null explícito, não some do patch.
      responsavelId: responsavelIdRaw ? String(responsavelIdRaw) : null,
    });
    await updateDocumento(workspaceId, documentoId, input);
  } catch (err) {
    if (err instanceof ApiError) return { status: "error", error: err.message };
    if (err instanceof ZodError) return { status: "error", error: err.issues.map((i) => i.message).join("; ") };
    throw err;
  }

  revalidatePath(`/workspaces/${workspaceId}/documentos/${documentoId}`);
  return { status: "success" };
}

// Pedido explícito do time: trocar Status direto na tabela, sem passar pela revisão —
// avisado que isso deixa o rótulo de revisão (A1/B0...), a linha do tempo e coisas como GRD
// fora de sincronia com o status "de verdade" do documento, e mesmo assim optaram por isso.
export async function setStatusDiretoAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) return { status: "error", error: "Não autenticado." };

  const workspaceId = String(formData.get("workspaceId") ?? "");
  const projetoId = String(formData.get("projetoId") ?? "");
  const obraId = String(formData.get("obraId") ?? "");
  const documentoId = String(formData.get("documentoId") ?? "");

  try {
    // Mesmo nível de permissão do Excluir em massa — trocar status ignorando o fluxo de
    // revisão é uma ação sensível o bastante pra não deixar qualquer papel fazer.
    await requireWorkspaceRole(session.user.id, workspaceId, ["administrador", "coordenador"]);
    await requireObraAccess(session.user.id, workspaceId, obraId);
    const input = setStatusDiretoSchema.parse({ status: formData.get("status") });
    await setStatusDireto(workspaceId, documentoId, input.status);
  } catch (err) {
    if (err instanceof ApiError) return { status: "error", error: err.message };
    if (err instanceof ZodError) return { status: "error", error: "Status inválido." };
    throw err;
  }

  revalidatePath(obraDocumentosPath(workspaceId, projetoId, obraId));
  revalidatePath(`/workspaces/${workspaceId}/documentos/${documentoId}`);
  return { status: "success" };
}

export async function transitionStatusAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) return { status: "error", error: "Não autenticado." };

  const workspaceId = String(formData.get("workspaceId") ?? "");
  const documentoId = String(formData.get("documentoId") ?? "");
  const revisaoId = String(formData.get("revisaoId") ?? "");

  try {
    await assertObraAccessForDocumento(session.user.id, workspaceId, documentoId);
    const input = transicaoStatusSchema.parse({ novoStatus: formData.get("novoStatus") });
    await transitionRevisaoStatus(workspaceId, documentoId, revisaoId, session.user.id, input.novoStatus);
  } catch (err) {
    if (err instanceof ApiError) return { status: "error", error: err.message };
    if (err instanceof ZodError) return { status: "error", error: "Status inválido." };
    throw err;
  }

  revalidatePath(`/workspaces/${workspaceId}/documentos/${documentoId}`);
  return { status: "success" };
}

export async function createRevisaoAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) return { status: "error", error: "Não autenticado." };

  const workspaceId = String(formData.get("workspaceId") ?? "");
  const documentoId = String(formData.get("documentoId") ?? "");
  const letraRaw = formData.get("letra");
  const numeroRaw = formData.get("numero");

  try {
    await assertObraAccessForDocumento(session.user.id, workspaceId, documentoId);
    const input = revisaoCreateSchema.parse({
      letra: letraRaw ? String(letraRaw).toUpperCase() : undefined,
      numero: numeroRaw ? Number(numeroRaw) : undefined,
    });

    const arquivoOriginalFile = formData.get("arquivoOriginal");
    const arquivoPdfFile = formData.get("arquivoPdf");

    await createRevisao(workspaceId, documentoId, session.user.id, {
      ...input,
      arquivoOriginal:
        arquivoOriginalFile instanceof File && arquivoOriginalFile.size > 0
          ? {
              buffer: Buffer.from(await arquivoOriginalFile.arrayBuffer()),
              nome: arquivoOriginalFile.name,
              mimeType: arquivoOriginalFile.type || "application/octet-stream",
              tamanho: arquivoOriginalFile.size,
            }
          : undefined,
      arquivoPdf:
        arquivoPdfFile instanceof File && arquivoPdfFile.size > 0
          ? {
              buffer: Buffer.from(await arquivoPdfFile.arrayBuffer()),
              nome: arquivoPdfFile.name,
              mimeType: arquivoPdfFile.type || "application/octet-stream",
              tamanho: arquivoPdfFile.size,
            }
          : undefined,
    });
  } catch (err) {
    if (err instanceof ApiError) return { status: "error", error: err.message };
    if (err instanceof ZodError) return { status: "error", error: err.issues.map((i) => i.message).join("; ") };
    throw err;
  }

  revalidatePath(`/workspaces/${workspaceId}/documentos/${documentoId}`);
  return { status: "success" };
}

export async function uploadAnexosAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) return { status: "error", error: "Não autenticado." };

  const workspaceId = String(formData.get("workspaceId") ?? "");
  const documentoId = String(formData.get("documentoId") ?? "");
  const revisaoId = String(formData.get("revisaoId") ?? "");

  const arquivos = formData.getAll("arquivos").filter((a): a is File => a instanceof File && a.size > 0);
  if (arquivos.length === 0) return { status: "error", error: "Selecione ao menos um arquivo." };

  try {
    await assertObraAccessForDocumento(session.user.id, workspaceId, documentoId);
    for (const arquivo of arquivos) {
      const buffer = Buffer.from(await arquivo.arrayBuffer());
      await createAnexoRevisao(workspaceId, revisaoId, session.user.id, {
        buffer,
        nome: arquivo.name,
        mimeType: arquivo.type || "application/octet-stream",
        tamanho: arquivo.size,
      });
    }
  } catch (err) {
    if (err instanceof ApiError) return { status: "error", error: err.message };
    throw err;
  }

  revalidatePath(`/workspaces/${workspaceId}/documentos/${documentoId}`);
  return { status: "success" };
}

export async function deleteAnexoAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) return { status: "error", error: "Não autenticado." };

  const workspaceId = String(formData.get("workspaceId") ?? "");
  const documentoId = String(formData.get("documentoId") ?? "");
  const anexoId = String(formData.get("anexoId") ?? "");

  try {
    await assertObraAccessForDocumento(session.user.id, workspaceId, documentoId);
    await deleteAnexo(workspaceId, anexoId);
  } catch (err) {
    if (err instanceof ApiError) return { status: "error", error: err.message };
    throw err;
  }

  revalidatePath(`/workspaces/${workspaceId}/documentos/${documentoId}`);
  return { status: "success" };
}

export async function uploadArquivoRevisaoAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) return { status: "error", error: "Não autenticado." };

  const workspaceId = String(formData.get("workspaceId") ?? "");
  const documentoId = String(formData.get("documentoId") ?? "");
  const revisaoId = String(formData.get("revisaoId") ?? "");
  const tipoRaw = formData.get("tipo");
  const tipo = tipoRaw === "original" || tipoRaw === "pdf" ? tipoRaw : null;

  const arquivo = formData.get("arquivo");
  if (!tipo) return { status: "error", error: "Tipo de arquivo inválido." };
  if (!(arquivo instanceof File) || arquivo.size === 0) return { status: "error", error: "Selecione um arquivo." };

  try {
    await assertObraAccessForDocumento(session.user.id, workspaceId, documentoId);
    await setArquivoRevisao(workspaceId, documentoId, revisaoId, session.user.id, tipo, {
      buffer: Buffer.from(await arquivo.arrayBuffer()),
      nome: arquivo.name,
      mimeType: arquivo.type || "application/octet-stream",
      tamanho: arquivo.size,
    });
  } catch (err) {
    if (err instanceof ApiError) return { status: "error", error: err.message };
    throw err;
  }

  revalidatePath(`/workspaces/${workspaceId}/documentos/${documentoId}`);
  return { status: "success" };
}

export async function toggleConferidoAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) return { status: "error", error: "Não autenticado." };

  const workspaceId = String(formData.get("workspaceId") ?? "");
  const documentoId = String(formData.get("documentoId") ?? "");
  const revisaoId = String(formData.get("revisaoId") ?? "");

  try {
    await assertObraAccessForDocumento(session.user.id, workspaceId, documentoId);
    await toggleConferido(workspaceId, documentoId, revisaoId, session.user.id);
  } catch (err) {
    if (err instanceof ApiError) return { status: "error", error: err.message };
    throw err;
  }

  revalidatePath(`/workspaces/${workspaceId}/documentos/${documentoId}`);
  return { status: "success" };
}

export async function addComentarioAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) return { status: "error", error: "Não autenticado." };

  const workspaceId = String(formData.get("workspaceId") ?? "");
  const documentoId = String(formData.get("documentoId") ?? "");
  const revisaoId = String(formData.get("revisaoId") ?? "");

  try {
    await assertObraAccessForDocumento(session.user.id, workspaceId, documentoId);
    const input = comentarioCreateSchema.parse({
      corpo: formData.get("corpo"),
      anexoNome: formData.get("anexoNome") || undefined,
      anexoUrl: formData.get("anexoUrl") || undefined,
      marcarPendenciaCliente: formData.get("marcarPendenciaCliente") === "on",
    });
    await createComentario(workspaceId, documentoId, revisaoId, session.user.id, input);
  } catch (err) {
    if (err instanceof ApiError) return { status: "error", error: err.message };
    if (err instanceof ZodError) return { status: "error", error: err.issues.map((i) => i.message).join("; ") };
    throw err;
  }

  revalidatePath(`/workspaces/${workspaceId}/documentos/${documentoId}`);
  return { status: "success" };
}
