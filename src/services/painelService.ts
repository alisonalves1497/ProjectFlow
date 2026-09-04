import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { documentos, copiasControladas, linhaDoTempo, revisoes, users } from "@/db/schema";
import { listAccessibleObraIdsInWorkspace } from "./permissions";
import type { StatusDocumento } from "@/lib/statusGraph";
import { isDocumentoFechado, dataEfetivaPrevista } from "@/lib/documentoStatus";

// Quanto mais "adiantado" no fluxo, mais em cima aparece em Minhas Pendências — devolvido
// pra correção é mais urgente que só ter começado, que por sua vez é mais urgente que
// ainda nem ter sido iniciado (previsto). Só cobre os status que entram em pendência
// (ver meusDocumentosPendentes); os demais não aparecem aqui de qualquer forma.
const PRIORIDADE_PENDENCIA: Partial<Record<StatusDocumento, number>> = {
  devolvido_correcao: 4,
  em_elaboracao: 3,
  em_rascunho: 2,
  previsto: 1,
};

export type PainelData = {
  documentosAtivos: number;
  documentosEmAtraso: number;
  minhasPendencias: {
    documentos: { id: string; codigoCompleto: string; descricao: string; status: StatusDocumento; obraId: string }[];
    copiasControladas: { id: string; documentoId: string; documentoCodigo: string; revisaoLabel: string | null; obraId: string }[];
  };
  programacaoSemana: { id: string; codigoCompleto: string; descricao: string; dataPrevista: string; reprogramado: boolean; obraId: string }[];
  atividadeRecente: {
    id: string;
    documentoId: string;
    documentoCodigo: string;
    obraId: string;
    evento: string;
    autorNome: string | null;
    metadata: unknown;
    createdAt: Date;
  }[];
};

export type EventoAtividade = PainelData["atividadeRecente"][number];

// Reaproveitada pelo widget do Painel (top 5) e pela página "Ver tudo" (top 100) —
// mesma query, só o teto muda.
export async function listAtividadeRecente(workspaceId: string, userId: string, limite: number): Promise<EventoAtividade[]> {
  const obraIds = await listAccessibleObraIdsInWorkspace(userId, workspaceId);
  if (obraIds.length === 0) return [];

  return db
    .select({
      id: linhaDoTempo.id,
      documentoId: linhaDoTempo.documentoId,
      documentoCodigo: documentos.codigoCompleto,
      obraId: documentos.obraId,
      evento: linhaDoTempo.evento,
      autorNome: users.name,
      metadata: linhaDoTempo.metadata,
      createdAt: linhaDoTempo.createdAt,
    })
    .from(linhaDoTempo)
    .innerJoin(documentos, eq(documentos.id, linhaDoTempo.documentoId))
    .leftJoin(users, eq(users.id, linhaDoTempo.autorId))
    .where(and(eq(linhaDoTempo.workspaceId, workspaceId), inArray(documentos.obraId, obraIds)))
    .orderBy(desc(linhaDoTempo.createdAt))
    .limit(limite);
}

export async function getPainelData(workspaceId: string, userId: string): Promise<PainelData> {
  const obraIds = await listAccessibleObraIdsInWorkspace(userId, workspaceId);

  const vazio: PainelData = {
    documentosAtivos: 0,
    documentosEmAtraso: 0,
    minhasPendencias: { documentos: [], copiasControladas: [] },
    programacaoSemana: [],
    atividadeRecente: [],
  };
  if (obraIds.length === 0) return vazio;

  const hoje = new Date().toISOString().slice(0, 10);
  const em7Dias = new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10);

  const docs = await db
    .select({
      id: documentos.id,
      codigoCompleto: documentos.codigoCompleto,
      descricao: documentos.descricao,
      obraId: documentos.obraId,
      status: documentos.status,
      dataPrevista: documentos.dataPrevista,
      dataReprogramada: documentos.dataReprogramada,
      responsavelId: documentos.responsavelId,
      currentRevisionId: documentos.currentRevisionId,
      revisaoEhAsBuilt: revisoes.ehAsBuilt,
      revisaoLetra: revisoes.letra,
      revisaoNumero: revisoes.numero,
    })
    .from(documentos)
    .leftJoin(revisoes, eq(revisoes.id, documentos.currentRevisionId))
    .where(and(inArray(documentos.obraId, obraIds), eq(documentos.workspaceId, workspaceId), isNull(documentos.deletedAt)));

  const docsComDerivados = docs.map((d) => ({
    ...d,
    fechado: isDocumentoFechado(d),
    ...dataEfetivaPrevista(d),
  }));
  const ativos = docsComDerivados.filter((d) => !d.fechado);

  const documentosAtivos = ativos.length;
  const documentosEmAtraso = ativos.filter((d) => d.data !== null && d.data < hoje).length;

  // "previsto" entra aqui de propósito — é pendência assim que atribuída, não só depois de
  // alguém criar a primeira revisão e "entrar no fluxo" de verdade.
  const meusDocumentosPendentes = ativos
    .filter(
      (d) =>
        d.responsavelId === userId &&
        (d.status === "previsto" || d.status === "em_rascunho" || d.status === "em_elaboracao" || d.status === "devolvido_correcao")
    )
    .map((d) => ({ id: d.id, codigoCompleto: d.codigoCompleto, descricao: d.descricao, status: d.status, obraId: d.obraId }))
    .sort((a, b) => (PRIORIDADE_PENDENCIA[b.status] ?? 0) - (PRIORIDADE_PENDENCIA[a.status] ?? 0));

  // Só do responsável logado — igual meusDocumentosPendentes, senão mostra a entrega de
  // todo mundo na obra como se fosse "sua" (bug relatado: usuário sem nada atribuído via
  // documento de outra pessoa aparecendo aqui).
  const programacaoSemana = ativos
    .filter((d) => d.responsavelId === userId && d.data !== null && d.data >= hoje && d.data <= em7Dias)
    .sort((a, b) => (a.data! < b.data! ? -1 : 1))
    .map((d) => ({ id: d.id, codigoCompleto: d.codigoCompleto, descricao: d.descricao, dataPrevista: d.data!, reprogramado: d.reprogramado, obraId: d.obraId }));

  const documentoAtualPorId = new Map(docs.map((d) => [d.id, d.currentRevisionId]));
  const minhasCopias = await db
    .select({
      id: copiasControladas.id,
      documentoId: copiasControladas.documentoId,
      documentoCodigo: documentos.codigoCompleto,
      revisaoId: copiasControladas.revisaoId,
      revisaoLabel: revisoes.label,
      obraId: copiasControladas.obraId,
    })
    .from(copiasControladas)
    .innerJoin(documentos, eq(documentos.id, copiasControladas.documentoId))
    .innerJoin(revisoes, eq(revisoes.id, copiasControladas.revisaoId))
    .where(
      and(
        eq(copiasControladas.workspaceId, workspaceId),
        inArray(copiasControladas.obraId, obraIds),
        eq(copiasControladas.detentorId, userId),
        eq(copiasControladas.status, "ativa")
      )
    );
  const copiasASubstituir = minhasCopias
    .filter((c) => c.revisaoId !== documentoAtualPorId.get(c.documentoId))
    .map((c) => ({ id: c.id, documentoId: c.documentoId, documentoCodigo: c.documentoCodigo, revisaoLabel: c.revisaoLabel, obraId: c.obraId }));

  const eventos = await listAtividadeRecente(workspaceId, userId, 5);

  return {
    documentosAtivos,
    documentosEmAtraso,
    minhasPendencias: { documentos: meusDocumentosPendentes, copiasControladas: copiasASubstituir },
    programacaoSemana,
    atividadeRecente: eventos,
  };
}
