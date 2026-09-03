import { and, desc, eq, ilike, isNull, or, sql } from "drizzle-orm";
import { db } from "@/db/client";
import {
  itensConhecimento,
  itensConhecimentoDocumentos,
  contadoresConhecimentoSequencial,
  obras,
  documentos,
  categoriasConhecimento,
} from "@/db/schema";
import { newId } from "@/lib/id";
import { ApiError, badRequest, conflict, notFound } from "@/lib/errors";
import { validNextStatuses, type TipoItemConhecimento, type StatusItemConhecimento } from "@/lib/conhecimentoStatusGraph";
import { logTimelineEvent } from "./timelineService";

export async function createItemConhecimento(
  workspaceId: string,
  obraId: string,
  userId: string,
  input: { tipo: TipoItemConhecimento; titulo: string; descricao: string; categoriaId?: string; documentoIds?: string[] }
) {
  return db.transaction(async (tx) => {
    const [obra] = await tx
      .select({ id: obras.id, code: obras.code })
      .from(obras)
      .where(and(eq(obras.id, obraId), eq(obras.workspaceId, workspaceId), isNull(obras.deletedAt)))
      .limit(1);
    if (!obra) throw notFound("OBRA_NOT_FOUND", "Obra não encontrada.");

    if (input.categoriaId) {
      const [categoria] = await tx
        .select({ id: categoriasConhecimento.id })
        .from(categoriasConhecimento)
        .where(and(eq(categoriasConhecimento.id, input.categoriaId), eq(categoriasConhecimento.workspaceId, workspaceId)))
        .limit(1);
      if (!categoria) throw notFound("CATEGORIA_NOT_FOUND", "Categoria não encontrada.");
    }

    // Contador atômico por (obra, tipo) — RFI e RNC numeram independentemente.
    await tx
      .insert(contadoresConhecimentoSequencial)
      .values({ obraId, tipo: input.tipo, proximoValor: 1 })
      .onConflictDoNothing();

    const [counter] = await tx
      .update(contadoresConhecimentoSequencial)
      .set({ proximoValor: sql`${contadoresConhecimentoSequencial.proximoValor} + 1` })
      .where(and(eq(contadoresConhecimentoSequencial.obraId, obraId), eq(contadoresConhecimentoSequencial.tipo, input.tipo)))
      .returning({ proximoValor: contadoresConhecimentoSequencial.proximoValor });
    if (!counter) throw new ApiError(500, "SEQUENCIAL_GENERATION_FAILED", "Falha ao gerar o sequencial.");

    const numeroSequencial = counter.proximoValor - 1;
    const codigoCompleto = `${input.tipo.toUpperCase()}-${obra.code}-${String(numeroSequencial).padStart(3, "0")}`;

    let item;
    try {
      [item] = await tx
        .insert(itensConhecimento)
        .values({
          id: newId("conh"),
          workspaceId,
          obraId,
          tipo: input.tipo,
          numeroSequencial,
          codigoCompleto,
          categoriaId: input.categoriaId,
          titulo: input.titulo,
          descricao: input.descricao,
          criadoPor: userId,
        })
        .returning();
    } catch {
      throw conflict("ITEM_CONHECIMENTO_CODIGO_JA_EXISTE", `Já existe um item com o código '${codigoCompleto}'.`);
    }

    const documentoIds = input.documentoIds ?? [];
    for (const documentoId of documentoIds) {
      const [documento] = await tx
        .select({ id: documentos.id, obraId: documentos.obraId, codigoCompleto: documentos.codigoCompleto })
        .from(documentos)
        .where(and(eq(documentos.id, documentoId), eq(documentos.workspaceId, workspaceId), isNull(documentos.deletedAt)))
        .limit(1);
      if (!documento) throw notFound("DOCUMENTO_NOT_FOUND", `Documento ${documentoId} não encontrado.`);
      if (documento.obraId !== obraId) {
        throw badRequest("DOCUMENTO_OBRA_MISMATCH", `Documento ${documento.codigoCompleto} pertence a outra obra.`);
      }
      await tx.insert(itensConhecimentoDocumentos).values({ id: newId("cdoc"), itemConhecimentoId: item.id, documentoId });

      await logTimelineEvent(tx, {
        workspaceId,
        documentoId,
        evento: input.tipo === "rfi" ? "rfi_criada" : "rnc_criada",
        autorId: userId,
        metadata: { itemConhecimentoId: item.id, codigoCompleto: item.codigoCompleto },
      });
    }

    return item;
  });
}

export async function listItensConhecimento(
  workspaceId: string,
  filters: {
    obraId?: string;
    tipo?: TipoItemConhecimento;
    status?: StatusItemConhecimento;
    categoriaId?: string;
    documentoId?: string;
    busca?: string;
    apenasLicoesAprendidas?: boolean;
  }
) {
  const condicoes = [eq(itensConhecimento.workspaceId, workspaceId), isNull(itensConhecimento.deletedAt)];
  if (filters.obraId) condicoes.push(eq(itensConhecimento.obraId, filters.obraId));
  if (filters.tipo) condicoes.push(eq(itensConhecimento.tipo, filters.tipo));
  if (filters.status) condicoes.push(eq(itensConhecimento.status, filters.status));
  if (filters.categoriaId) condicoes.push(eq(itensConhecimento.categoriaId, filters.categoriaId));
  if (filters.busca) {
    condicoes.push(or(ilike(itensConhecimento.titulo, `%${filters.busca}%`), ilike(itensConhecimento.descricao, `%${filters.busca}%`))!);
  }
  if (filters.apenasLicoesAprendidas) {
    condicoes.push(eq(itensConhecimento.status, "fechada"));
    condicoes.push(sql`${itensConhecimento.categoriaId} is not null`);
  }

  if (filters.documentoId) {
    return db
      .select({
        id: itensConhecimento.id,
        tipo: itensConhecimento.tipo,
        codigoCompleto: itensConhecimento.codigoCompleto,
        titulo: itensConhecimento.titulo,
        status: itensConhecimento.status,
        categoriaId: itensConhecimento.categoriaId,
        createdAt: itensConhecimento.createdAt,
      })
      .from(itensConhecimentoDocumentos)
      .innerJoin(itensConhecimento, eq(itensConhecimento.id, itensConhecimentoDocumentos.itemConhecimentoId))
      .where(and(eq(itensConhecimentoDocumentos.documentoId, filters.documentoId), ...condicoes))
      .orderBy(desc(itensConhecimento.createdAt));
  }

  return db
    .select()
    .from(itensConhecimento)
    .where(and(...condicoes))
    .orderBy(desc(itensConhecimento.createdAt));
}

export async function getItemConhecimentoOrThrow(workspaceId: string, itemId: string) {
  const [item] = await db
    .select()
    .from(itensConhecimento)
    .where(and(eq(itensConhecimento.id, itemId), eq(itensConhecimento.workspaceId, workspaceId), isNull(itensConhecimento.deletedAt)))
    .limit(1);
  if (!item) throw notFound("ITEM_CONHECIMENTO_NOT_FOUND", "Item não encontrado.");
  return item;
}

export async function listDocumentosVinculados(itemId: string) {
  return db
    .select({ id: documentos.id, codigoCompleto: documentos.codigoCompleto, descricao: documentos.descricao })
    .from(itensConhecimentoDocumentos)
    .innerJoin(documentos, eq(documentos.id, itensConhecimentoDocumentos.documentoId))
    .where(eq(itensConhecimentoDocumentos.itemConhecimentoId, itemId));
}

// Os grafos de RFI/RNC são estritamente lineares (sem ramificação) — o próximo status é
// sempre único e determinístico, então avançar não exige que o cliente informe o alvo,
// só os dados extras exigidos por certas transições (resposta, ação corretiva).
export async function avancarStatus(
  workspaceId: string,
  itemId: string,
  userId: string,
  dados?: { resposta?: string; acaoCorretiva?: string }
) {
  const item = await getItemConhecimentoOrThrow(workspaceId, itemId);
  const proximos = validNextStatuses(item.tipo, item.status);
  if (proximos.length === 0) {
    throw conflict("ITEM_CONHECIMENTO_JA_FECHADO", "Este item já está fechado, não há próximo status.");
  }
  const proximo = proximos[0];

  const patch: Record<string, unknown> = { status: proximo, updatedAt: new Date() };

  if (proximo === "respondida") {
    if (!dados?.resposta) throw badRequest("RESPOSTA_OBRIGATORIA", "Informe a resposta.");
    patch.resposta = dados.resposta;
    patch.respondidoPorId = userId;
    patch.respondidoEm = new Date();
  }
  if (proximo === "corrigida") {
    if (!dados?.acaoCorretiva) throw badRequest("ACAO_CORRETIVA_OBRIGATORIA", "Informe a ação corretiva.");
    patch.acaoCorretiva = dados.acaoCorretiva;
    patch.corrigidoPorId = userId;
    patch.corrigidoEm = new Date();
  }
  if (proximo === "verificada") {
    patch.verificadoPorId = userId;
    patch.verificadoEm = new Date();
  }
  if (proximo === "fechada") {
    patch.fechadoPorId = userId;
    patch.fechadoEm = new Date();
  }

  return db.transaction(async (tx) => {
    const [atualizado] = await tx.update(itensConhecimento).set(patch).where(eq(itensConhecimento.id, itemId)).returning();

    const documentosVinculados = await tx
      .select({ documentoId: itensConhecimentoDocumentos.documentoId })
      .from(itensConhecimentoDocumentos)
      .where(eq(itensConhecimentoDocumentos.itemConhecimentoId, itemId));

    for (const { documentoId } of documentosVinculados) {
      await logTimelineEvent(tx, {
        workspaceId,
        documentoId,
        evento: item.tipo === "rfi" ? "rfi_status_alterado" : "rnc_status_alterado",
        autorId: userId,
        metadata: { itemConhecimentoId: itemId, codigoCompleto: item.codigoCompleto, de: item.status, para: proximo },
      });
    }

    return atualizado;
  });
}
