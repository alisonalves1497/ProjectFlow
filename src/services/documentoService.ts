import { and, eq, ilike, inArray, isNull, ne, or, sql } from "drizzle-orm";
import { db } from "@/db/client";
import {
  documentos,
  obras,
  projetos,
  disciplinas,
  fases,
  tiposDocumento,
  secoes,
  obraDisciplinas,
  revisoes,
  contadoresSequencial,
  itensConhecimento,
  itensConhecimentoDocumentos,
  users,
  documentoFavoritos,
} from "@/db/schema";
import { newId } from "@/lib/id";
import { ApiError, badRequest, conflict, isUniqueViolation, notFound } from "@/lib/errors";
import type { StatusDocumento } from "@/lib/statusGraph";
import { isDocumentoFechado, isDocumentoComRetrabalho, dataEfetivaPrevista } from "@/lib/documentoStatus";
import { logTimelineEvent } from "./timelineService";

export async function createDocumento(
  workspaceId: string,
  userId: string,
  input: {
    obraId: string;
    disciplinaId: string;
    secaoId: string;
    faseId: string;
    tipoDocumentoId: string;
    descricao: string;
    responsavelId?: string;
    dataBaseline?: string;
    dataReprogramada?: string;
    dataPrevista?: string;
  }
) {
  return db.transaction(async (tx) => {
    const [obra] = await tx
      .select({ id: obras.id, projetoId: obras.projetoId, code: obras.code })
      .from(obras)
      .where(and(eq(obras.id, input.obraId), eq(obras.workspaceId, workspaceId), isNull(obras.deletedAt)))
      .limit(1);
    if (!obra) throw notFound("OBRA_NOT_FOUND", "Obra não encontrada.");

    const [projeto] = await tx.select({ code: projetos.code }).from(projetos).where(eq(projetos.id, obra.projetoId)).limit(1);
    if (!projeto) throw notFound("PROJETO_NOT_FOUND", "Projeto não encontrado.");

    const [disciplina] = await tx
      .select({ id: disciplinas.id, code: disciplinas.code })
      .from(disciplinas)
      .where(and(eq(disciplinas.id, input.disciplinaId), eq(disciplinas.workspaceId, workspaceId)))
      .limit(1);
    if (!disciplina) throw notFound("DISCIPLINA_NOT_FOUND", "Disciplina não encontrada.");

    const [fase] = await tx
      .select({ code: fases.code })
      .from(fases)
      .where(and(eq(fases.id, input.faseId), eq(fases.workspaceId, workspaceId)))
      .limit(1);
    if (!fase) throw notFound("FASE_NOT_FOUND", "Fase não encontrada.");

    const [tipo] = await tx
      .select({ code: tiposDocumento.code })
      .from(tiposDocumento)
      .where(and(eq(tiposDocumento.id, input.tipoDocumentoId), eq(tiposDocumento.workspaceId, workspaceId)))
      .limit(1);
    if (!tipo) throw notFound("TIPO_DOCUMENTO_NOT_FOUND", "Tipo de documento não encontrado.");

    const [secao] = await tx
      .select({ id: secoes.id, obraDisciplinaId: secoes.obraDisciplinaId })
      .from(secoes)
      .where(eq(secoes.id, input.secaoId))
      .limit(1);
    if (!secao) throw notFound("SECAO_NOT_FOUND", "Seção não encontrada.");

    const [od] = await tx
      .select({ id: obraDisciplinas.id })
      .from(obraDisciplinas)
      .where(
        and(
          eq(obraDisciplinas.id, secao.obraDisciplinaId),
          eq(obraDisciplinas.obraId, input.obraId),
          eq(obraDisciplinas.disciplinaId, input.disciplinaId)
        )
      )
      .limit(1);
    if (!od) throw badRequest("SECAO_OBRA_DISCIPLINA_MISMATCH", "A seção informada não pertence a esta combinação de obra e disciplina.");

    // Contador atômico: sequencial único por (obra, disciplina, tipo), compartilhado entre fases (Opção A).
    await tx
      .insert(contadoresSequencial)
      .values({ obraId: input.obraId, disciplinaId: input.disciplinaId, tipoDocumentoId: input.tipoDocumentoId, proximoValor: 1 })
      .onConflictDoNothing();

    const [counter] = await tx
      .update(contadoresSequencial)
      .set({ proximoValor: sql`${contadoresSequencial.proximoValor} + 1` })
      .where(
        and(
          eq(contadoresSequencial.obraId, input.obraId),
          eq(contadoresSequencial.disciplinaId, input.disciplinaId),
          eq(contadoresSequencial.tipoDocumentoId, input.tipoDocumentoId)
        )
      )
      .returning({ proximoValor: contadoresSequencial.proximoValor });
    if (!counter) throw new ApiError(500, "SEQUENCIAL_GENERATION_FAILED", "Falha ao gerar o sequencial do documento.");

    const sequencial = counter.proximoValor - 1;
    const codigoCompleto = `${projeto.code}-${obra.code}-${fase.code}-${disciplina.code}-${tipo.code}-${String(sequencial).padStart(4, "0")}`;

    let documento;
    try {
      [documento] = await tx
        .insert(documentos)
        .values({
          id: newId("doc"),
          workspaceId,
          obraId: input.obraId,
          disciplinaId: input.disciplinaId,
          secaoId: input.secaoId,
          faseId: input.faseId,
          tipoDocumentoId: input.tipoDocumentoId,
          sequencial,
          codigoCompleto,
          descricao: input.descricao,
          responsavelId: input.responsavelId,
          dataBaseline: input.dataBaseline,
          dataReprogramada: input.dataReprogramada,
          dataPrevista: input.dataPrevista,
          createdBy: userId,
        })
        .returning();
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw conflict("DOCUMENTO_CODIGO_JA_EXISTE", `Já existe um documento com o código '${codigoCompleto}'.`);
      }
      throw err;
    }

    await logTimelineEvent(tx, { workspaceId, documentoId: documento.id, evento: "documento_criado", autorId: userId });

    return documento;
  });
}

export async function listDocumentos(
  workspaceId: string,
  filters: { obraId?: string; disciplinaId?: string; secaoId?: string; status?: StatusDocumento }
) {
  const conditions = [eq(documentos.workspaceId, workspaceId), isNull(documentos.deletedAt)];
  if (filters.obraId) conditions.push(eq(documentos.obraId, filters.obraId));
  if (filters.disciplinaId) conditions.push(eq(documentos.disciplinaId, filters.disciplinaId));
  if (filters.secaoId) conditions.push(eq(documentos.secaoId, filters.secaoId));
  if (filters.status) conditions.push(eq(documentos.status, filters.status));

  return db
    .select()
    .from(documentos)
    .where(and(...conditions));
}

// Busca por código/descrição em todas as Obras que o usuário acessa no workspace (não uma
// Obra só) — usado pela lupa do cabeçalho. `obraIdsAcessiveis` já vem resolvido do chamador
// (administrador: todas; demais papéis: só obra_members) pra não duplicar essa regra aqui.
export async function buscarDocumentosNoWorkspace(workspaceId: string, obraIdsAcessiveis: string[], termo: string, limite = 30) {
  if (obraIdsAcessiveis.length === 0 || termo.trim().length === 0) return [];
  const like = `%${termo.trim()}%`;

  return db
    .select({
      id: documentos.id,
      codigoCompleto: documentos.codigoCompleto,
      descricao: documentos.descricao,
      status: documentos.status,
      obraId: documentos.obraId,
      obraNome: obras.name,
      projetoId: obras.projetoId,
      projetoNome: projetos.name,
    })
    .from(documentos)
    .innerJoin(obras, eq(obras.id, documentos.obraId))
    .innerJoin(projetos, eq(projetos.id, obras.projetoId))
    .where(
      and(
        eq(documentos.workspaceId, workspaceId),
        isNull(documentos.deletedAt),
        inArray(documentos.obraId, obraIdsAcessiveis),
        or(ilike(documentos.codigoCompleto, like), ilike(documentos.descricao, like))
      )
    )
    .limit(limite);
}

export async function getDocumentoOrThrow(workspaceId: string, documentoId: string) {
  const [documento] = await db
    .select()
    .from(documentos)
    .where(and(eq(documentos.id, documentoId), eq(documentos.workspaceId, workspaceId), isNull(documentos.deletedAt)))
    .limit(1);
  if (!documento) throw notFound("DOCUMENTO_NOT_FOUND", "Documento não encontrado.");
  return documento;
}

// Pedido explícito do time: trocar o Status direto, sem passar pelo fluxo de revisão
// (isValidInPlaceTransition/nextRevisionSpec). Ao contrário de transitionRevisaoStatus,
// NÃO cria/atualiza revisão nem grava evento na linha do tempo — só o campo em si muda.
// Único requisito é o status ser um dos valores válidos do enum (não é "campo livre" de
// texto); a checagem de QUEM pode fazer isso fica na action (administrador/coordenador).
export async function setStatusDireto(workspaceId: string, documentoId: string, status: StatusDocumento) {
  const [updated] = await db
    .update(documentos)
    .set({ status, statusUpdatedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(documentos.id, documentoId), eq(documentos.workspaceId, workspaceId), isNull(documentos.deletedAt)))
    .returning();
  if (!updated) throw notFound("DOCUMENTO_NOT_FOUND", "Documento não encontrado.");
  return updated;
}

// Confirma que `secaoId` pertence à mesma obra+disciplina de `documentoId` — a Seção não
// entra no código do documento, mas a Disciplina sim, então mudar de Disciplina via "mover"
// deixaria o código incoerente com a nova seção. Lança se a seção pertencer a outra disciplina.
async function assertSecaoMesmaDisciplina(documento: { obraId: string; disciplinaId: string }, secaoId: string) {
  const [secao] = await db
    .select({ id: secoes.id, obraDisciplinaId: secoes.obraDisciplinaId })
    .from(secoes)
    .where(eq(secoes.id, secaoId))
    .limit(1);
  if (!secao) throw notFound("SECAO_NOT_FOUND", "Seção não encontrada.");

  const [od] = await db
    .select({ id: obraDisciplinas.id })
    .from(obraDisciplinas)
    .where(
      and(
        eq(obraDisciplinas.id, secao.obraDisciplinaId),
        eq(obraDisciplinas.obraId, documento.obraId),
        eq(obraDisciplinas.disciplinaId, documento.disciplinaId)
      )
    )
    .limit(1);
  if (!od) throw badRequest("SECAO_DISCIPLINA_MISMATCH", "A seção informada pertence a outra disciplina.");
}

export async function updateDocumento(
  workspaceId: string,
  documentoId: string,
  patch: {
    descricao?: string;
    codigoCompleto?: string;
    responsavelId?: string | null;
    dataBaseline?: string | null;
    dataReprogramada?: string | null;
    dataPrevista?: string | null;
    secaoId?: string;
  }
) {
  if (patch.secaoId) {
    const documento = await getDocumentoOrThrow(workspaceId, documentoId);
    await assertSecaoMesmaDisciplina(documento, patch.secaoId);
  }

  let updated;
  try {
    [updated] = await db
      .update(documentos)
      .set({ ...patch, updatedAt: new Date() })
      .where(and(eq(documentos.id, documentoId), eq(documentos.workspaceId, workspaceId), isNull(documentos.deletedAt)))
      .returning();
  } catch (err) {
    // Código editado manualmente pode colidir com outro já existente — o contador
    // sequencial automático não sabe disso, então a unicidade só é garantida aqui.
    if (isUniqueViolation(err)) {
      throw conflict("DOCUMENTO_CODIGO_JA_EXISTE", `Já existe um documento com o código '${patch.codigoCompleto}'.`);
    }
    throw err;
  }
  if (!updated) throw notFound("DOCUMENTO_NOT_FOUND", "Documento não encontrado.");
  return updated;
}

// Escopa e valida um lote de IDs antes de qualquer ação em massa — garante que todos
// pertencem à obra/workspace informados (não confia apenas no que o client mandou).
async function assertDocumentosNaObra(workspaceId: string, obraId: string, documentoIds: string[]) {
  const rows = await db
    .select({ id: documentos.id, disciplinaId: documentos.disciplinaId })
    .from(documentos)
    .where(
      and(
        inArray(documentos.id, documentoIds),
        eq(documentos.workspaceId, workspaceId),
        eq(documentos.obraId, obraId),
        isNull(documentos.deletedAt)
      )
    );
  if (rows.length !== documentoIds.length) {
    throw badRequest("DOCUMENTOS_FORA_DA_OBRA", "Um ou mais documentos selecionados não pertencem a esta obra.");
  }
  return rows;
}

// Mover pra uma Seção de OUTRA disciplina é permitido de propósito — troca junto a
// disciplinaId dos documentos pra bater com a seção de destino. Isso deixa o
// codigoCompleto (que carrega o código da disciplina ANTIGA) desatualizado; quem
// precisar do código coerente com a nova disciplina edita na tela do documento.
export async function bulkMoverSecao(workspaceId: string, obraId: string, documentoIds: string[], secaoId: string) {
  await assertDocumentosNaObra(workspaceId, obraId, documentoIds);

  const [secao] = await db
    .select({ id: secoes.id, obraDisciplinaId: secoes.obraDisciplinaId })
    .from(secoes)
    .where(eq(secoes.id, secaoId))
    .limit(1);
  if (!secao) throw notFound("SECAO_NOT_FOUND", "Seção não encontrada.");

  const [od] = await db
    .select({ disciplinaId: obraDisciplinas.disciplinaId })
    .from(obraDisciplinas)
    .where(and(eq(obraDisciplinas.id, secao.obraDisciplinaId), eq(obraDisciplinas.obraId, obraId)))
    .limit(1);
  if (!od) throw badRequest("SECAO_NOT_FOUND", "Seção não encontrada nesta obra.");

  return db
    .update(documentos)
    .set({ secaoId, disciplinaId: od.disciplinaId, updatedAt: new Date() })
    .where(inArray(documentos.id, documentoIds))
    .returning();
}

export async function bulkSoftDeleteDocumentos(workspaceId: string, obraId: string, documentoIds: string[]) {
  await assertDocumentosNaObra(workspaceId, obraId, documentoIds);
  return db
    .update(documentos)
    .set({ deletedAt: new Date() })
    .where(inArray(documentos.id, documentoIds))
    .returning();
}

export async function bulkAtribuir(workspaceId: string, obraId: string, documentoIds: string[], responsavelId: string) {
  await assertDocumentosNaObra(workspaceId, obraId, documentoIds);
  return db
    .update(documentos)
    .set({ responsavelId, updatedAt: new Date() })
    .where(inArray(documentos.id, documentoIds))
    .returning();
}

export async function bulkReprogramar(workspaceId: string, obraId: string, documentoIds: string[], dataReprogramada: string) {
  await assertDocumentosNaObra(workspaceId, obraId, documentoIds);
  return db
    .update(documentos)
    .set({ dataReprogramada, updatedAt: new Date() })
    .where(inArray(documentos.id, documentoIds))
    .returning();
}

export type DocumentoAgrupadoFiltros = {
  status?: StatusDocumento;
  disciplinaId?: string;
  secaoId?: string;
  somenteEmAtraso?: boolean;
  recentes?: boolean;
  comRetrabalho?: boolean;
  favoritos?: boolean;
  busca?: string;
};

export type GrupoSecaoDocumentos = {
  secaoId: string;
  secaoName: string;
  disciplinaName: string;
  documentos: {
    id: string;
    codigoCompleto: string;
    descricao: string;
    status: StatusDocumento;
    disciplinaId: string;
    updatedAt: Date;
    dataPrevista: string | null;
    reprogramado: boolean;
    temRevisao: boolean;
    emAtraso: boolean;
    naoConforme: boolean;
    recentes: boolean;
    comRetrabalho: boolean;
    favorito: boolean;
    statusUpdatedAt: Date;
    responsavelNome: string | null;
    revisaoLabel: string | null;
  }[];
  total: number;
  concluidos: number;
  percentualConcluido: number;
};

export async function listDocumentosAgrupadosPorSecao(
  workspaceId: string,
  obraId: string,
  userId: string,
  filtros: DocumentoAgrupadoFiltros
): Promise<GrupoSecaoDocumentos[]> {
  const estruturaCondicoes = [eq(obraDisciplinas.obraId, obraId)];
  if (filtros.disciplinaId) estruturaCondicoes.push(eq(obraDisciplinas.disciplinaId, filtros.disciplinaId));
  if (filtros.secaoId) estruturaCondicoes.push(eq(secoes.id, filtros.secaoId));

  const estrutura = await db
    .select({
      secaoId: secoes.id,
      secaoName: secoes.name,
      secaoPosition: secoes.position,
      disciplinaId: disciplinas.id,
      disciplinaName: disciplinas.name,
    })
    .from(secoes)
    .innerJoin(obraDisciplinas, eq(obraDisciplinas.id, secoes.obraDisciplinaId))
    .innerJoin(disciplinas, eq(disciplinas.id, obraDisciplinas.disciplinaId))
    .where(and(...estruturaCondicoes));

  const condicoes = [eq(documentos.workspaceId, workspaceId), eq(documentos.obraId, obraId), isNull(documentos.deletedAt)];
  if (filtros.status) condicoes.push(eq(documentos.status, filtros.status));
  if (filtros.disciplinaId) condicoes.push(eq(documentos.disciplinaId, filtros.disciplinaId));
  if (filtros.secaoId) condicoes.push(eq(documentos.secaoId, filtros.secaoId));
  if (filtros.busca) {
    const termo = `%${filtros.busca}%`;
    condicoes.push(or(ilike(documentos.codigoCompleto, termo), ilike(documentos.descricao, termo))!);
  }

  const [docs, naoConformeRows, favoritoRows] = await Promise.all([
    db
      .select({
        id: documentos.id,
        codigoCompleto: documentos.codigoCompleto,
        descricao: documentos.descricao,
        status: documentos.status,
        secaoId: documentos.secaoId,
        disciplinaId: documentos.disciplinaId,
        updatedAt: documentos.updatedAt,
        statusUpdatedAt: documentos.statusUpdatedAt,
        dataPrevista: documentos.dataPrevista,
        dataReprogramada: documentos.dataReprogramada,
        currentRevisionId: documentos.currentRevisionId,
        revisaoEhAsBuilt: revisoes.ehAsBuilt,
        revisaoLetra: revisoes.letra,
        revisaoNumero: revisoes.numero,
        revisaoLabel: revisoes.label,
        responsavelNome: users.name,
      })
      .from(documentos)
      .leftJoin(revisoes, eq(revisoes.id, documentos.currentRevisionId))
      .leftJoin(users, eq(users.id, documentos.responsavelId))
      .where(and(...condicoes)),
    // Documentos com pelo menos uma RNC ainda não fechada vinculada (Base de Conhecimento) —
    // usado só pro contador "Não Conformes", não é um status do Documento em si.
    db
      .selectDistinct({ documentoId: itensConhecimentoDocumentos.documentoId })
      .from(itensConhecimentoDocumentos)
      .innerJoin(itensConhecimento, eq(itensConhecimento.id, itensConhecimentoDocumentos.itemConhecimentoId))
      .where(and(eq(itensConhecimento.obraId, obraId), eq(itensConhecimento.tipo, "rnc"), ne(itensConhecimento.status, "fechada"))),
    db.select({ documentoId: documentoFavoritos.documentoId }).from(documentoFavoritos).where(eq(documentoFavoritos.userId, userId)),
  ]);
  const naoConformeIds = new Set(naoConformeRows.map((r) => r.documentoId));
  const favoritoIds = new Set(favoritoRows.map((r) => r.documentoId));

  const hoje = new Date().toISOString().slice(0, 10);
  const seteDiasAtras = new Date(Date.now() - 7 * 86_400_000);
  let docsFiltrados = docs.map((d) => {
    const fechado = isDocumentoFechado(d);
    const efetiva = dataEfetivaPrevista(d);
    return {
      ...d,
      fechado,
      ...efetiva,
      emAtraso: !fechado && efetiva.data !== null && efetiva.data < hoje,
      naoConforme: naoConformeIds.has(d.id),
      recentes: d.updatedAt >= seteDiasAtras,
      comRetrabalho: isDocumentoComRetrabalho(d),
      favorito: favoritoIds.has(d.id),
    };
  });

  if (filtros.somenteEmAtraso) {
    docsFiltrados = docsFiltrados.filter((d) => d.emAtraso);
  }
  if (filtros.recentes) {
    docsFiltrados = docsFiltrados.filter((d) => d.recentes);
  }
  if (filtros.comRetrabalho) {
    docsFiltrados = docsFiltrados.filter((d) => d.comRetrabalho);
  }
  if (filtros.favoritos) {
    docsFiltrados = docsFiltrados.filter((d) => d.favorito);
  }

  const porSecao = new Map<string, typeof docsFiltrados>();
  for (const d of docsFiltrados) {
    if (!porSecao.has(d.secaoId)) porSecao.set(d.secaoId, []);
    porSecao.get(d.secaoId)!.push(d);
  }

  return estrutura
    .sort((a, b) => a.disciplinaName.localeCompare(b.disciplinaName) || a.secaoPosition.localeCompare(b.secaoPosition))
    .map((s) => {
      const docsDaSecao = porSecao.get(s.secaoId) ?? [];
      const concluidos = docsDaSecao.filter((d) => d.fechado).length;
      return {
        secaoId: s.secaoId,
        secaoName: s.secaoName,
        disciplinaName: s.disciplinaName,
        documentos: docsDaSecao.map((d) => ({
          id: d.id,
          codigoCompleto: d.codigoCompleto,
          descricao: d.descricao,
          status: d.status,
          disciplinaId: d.disciplinaId,
          updatedAt: d.updatedAt,
          dataPrevista: d.data,
          reprogramado: d.reprogramado,
          temRevisao: d.currentRevisionId !== null,
          emAtraso: d.emAtraso,
          naoConforme: d.naoConforme,
          recentes: d.recentes,
          comRetrabalho: d.comRetrabalho,
          favorito: d.favorito,
          statusUpdatedAt: d.statusUpdatedAt,
          responsavelNome: d.responsavelNome,
          revisaoLabel: d.revisaoLabel,
        })),
        total: docsDaSecao.length,
        concluidos,
        percentualConcluido: docsDaSecao.length > 0 ? (concluidos / docsDaSecao.length) * 100 : 0,
      };
    });
}

export async function softDeleteDocumento(workspaceId: string, documentoId: string) {
  const [deleted] = await db
    .update(documentos)
    .set({ deletedAt: new Date() })
    .where(and(eq(documentos.id, documentoId), eq(documentos.workspaceId, workspaceId), isNull(documentos.deletedAt)))
    .returning();
  if (!deleted) throw notFound("DOCUMENTO_NOT_FOUND", "Documento não encontrado.");
  return deleted;
}

type TxLike = Pick<typeof db, "update" | "select">;

// Usado em cascata pela exclusão de Obra (e, por tabela, de Projeto): todos os documentos
// da obra levam o MESMO deletedAt do pai, pra restauração conseguir identificar o que
// pertence a essa exclusão específica (ver restoreDocumentosPorObra).
export async function softDeleteDocumentosPorObra(tx: TxLike, obraId: string, deletedAt: Date) {
  await tx.update(documentos).set({ deletedAt }).where(and(eq(documentos.obraId, obraId), isNull(documentos.deletedAt)));
}

export async function restoreDocumentosPorObra(tx: TxLike, obraId: string, deletedAt: Date) {
  await tx.update(documentos).set({ deletedAt: null }).where(and(eq(documentos.obraId, obraId), eq(documentos.deletedAt, deletedAt)));
}
