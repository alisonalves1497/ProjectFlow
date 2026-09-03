import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { itensSuprimento, itensSuprimentoDocumentos, obras, disciplinas, fornecedores, documentos } from "@/db/schema";
import { newId } from "@/lib/id";
import { badRequest, conflict, isUniqueViolation, notFound } from "@/lib/errors";

type ItemFilters = { obraId?: string; disciplinaId?: string; fornecedorId?: string; comprado?: boolean; critico?: boolean };

export async function createItemSuprimento(
  workspaceId: string,
  userId: string,
  input: {
    obraId: string;
    disciplinaId: string;
    codigo?: string;
    categoria?: string;
    nome: string;
    quantidade: number;
    unidadeMedida: string;
    valorUnitario: number;
    fornecedorId?: string;
    prazoPrevisto?: string;
    critico?: boolean;
    numeroPedidoCompra?: string;
    documentoIds?: string[];
  }
) {
  return db.transaction(async (tx) => {
    const [obra] = await tx
      .select({ id: obras.id })
      .from(obras)
      .where(and(eq(obras.id, input.obraId), eq(obras.workspaceId, workspaceId), isNull(obras.deletedAt)))
      .limit(1);
    if (!obra) throw notFound("OBRA_NOT_FOUND", "Obra não encontrada.");

    const [disciplina] = await tx
      .select({ id: disciplinas.id })
      .from(disciplinas)
      .where(and(eq(disciplinas.id, input.disciplinaId), eq(disciplinas.workspaceId, workspaceId)))
      .limit(1);
    if (!disciplina) throw notFound("DISCIPLINA_NOT_FOUND", "Disciplina não encontrada.");

    if (input.fornecedorId) {
      const [fornecedor] = await tx
        .select({ id: fornecedores.id })
        .from(fornecedores)
        .where(and(eq(fornecedores.id, input.fornecedorId), eq(fornecedores.workspaceId, workspaceId), isNull(fornecedores.deletedAt)))
        .limit(1);
      if (!fornecedor) throw notFound("FORNECEDOR_NOT_FOUND", "Fornecedor não encontrado.");
    }

    const [item] = await tx
      .insert(itensSuprimento)
      .values({
        id: newId("item"),
        workspaceId,
        obraId: input.obraId,
        disciplinaId: input.disciplinaId,
        codigo: input.codigo,
        categoria: input.categoria,
        nome: input.nome,
        quantidade: String(input.quantidade),
        unidadeMedida: input.unidadeMedida,
        valorUnitario: String(input.valorUnitario),
        fornecedorId: input.fornecedorId,
        prazoPrevisto: input.prazoPrevisto,
        critico: input.critico ?? false,
        numeroPedidoCompra: input.numeroPedidoCompra,
        createdBy: userId,
      })
      .returning();

    for (const documentoId of input.documentoIds ?? []) {
      const [documento] = await tx
        .select({ id: documentos.id, obraId: documentos.obraId, codigoCompleto: documentos.codigoCompleto })
        .from(documentos)
        .where(and(eq(documentos.id, documentoId), eq(documentos.workspaceId, workspaceId), isNull(documentos.deletedAt)))
        .limit(1);
      if (!documento) throw notFound("DOCUMENTO_NOT_FOUND", `Documento ${documentoId} não encontrado.`);
      if (documento.obraId !== input.obraId) {
        throw badRequest(
          "DOCUMENTO_OBRA_MISMATCH",
          `Documento ${documento.codigoCompleto} pertence a outra obra, não pode ser vinculado a este item.`
        );
      }
      await tx.insert(itensSuprimentoDocumentos).values({ id: newId("isd"), itemSuprimentoId: item.id, documentoId });
    }

    return item;
  });
}

export async function listItensSuprimento(workspaceId: string, filters: ItemFilters) {
  const conditions = [eq(itensSuprimento.workspaceId, workspaceId), isNull(itensSuprimento.deletedAt)];
  if (filters.obraId) conditions.push(eq(itensSuprimento.obraId, filters.obraId));
  if (filters.disciplinaId) conditions.push(eq(itensSuprimento.disciplinaId, filters.disciplinaId));
  if (filters.fornecedorId) conditions.push(eq(itensSuprimento.fornecedorId, filters.fornecedorId));
  if (filters.comprado !== undefined) conditions.push(eq(itensSuprimento.comprado, filters.comprado));
  if (filters.critico !== undefined) conditions.push(eq(itensSuprimento.critico, filters.critico));

  return db
    .select()
    .from(itensSuprimento)
    .where(and(...conditions));
}

export async function getItemSuprimentoOrThrow(workspaceId: string, itemId: string) {
  const [item] = await db
    .select()
    .from(itensSuprimento)
    .where(and(eq(itensSuprimento.id, itemId), eq(itensSuprimento.workspaceId, workspaceId), isNull(itensSuprimento.deletedAt)))
    .limit(1);
  if (!item) throw notFound("ITEM_SUPRIMENTO_NOT_FOUND", "Item de suprimento não encontrado.");
  return item;
}

export async function updateItemSuprimento(
  workspaceId: string,
  itemId: string,
  patch: {
    disciplinaId?: string;
    codigo?: string | null;
    categoria?: string | null;
    nome?: string;
    quantidade?: number;
    unidadeMedida?: string;
    valorUnitario?: number;
    fornecedorId?: string | null;
    prazoPrevisto?: string | null;
    critico?: boolean;
    numeroPedidoCompra?: string | null;
  }
) {
  if (patch.disciplinaId) {
    const [disciplina] = await db
      .select({ id: disciplinas.id })
      .from(disciplinas)
      .where(and(eq(disciplinas.id, patch.disciplinaId), eq(disciplinas.workspaceId, workspaceId)))
      .limit(1);
    if (!disciplina) throw notFound("DISCIPLINA_NOT_FOUND", "Disciplina não encontrada.");
  }
  if (patch.fornecedorId) {
    const [fornecedor] = await db
      .select({ id: fornecedores.id })
      .from(fornecedores)
      .where(and(eq(fornecedores.id, patch.fornecedorId), eq(fornecedores.workspaceId, workspaceId), isNull(fornecedores.deletedAt)))
      .limit(1);
    if (!fornecedor) throw notFound("FORNECEDOR_NOT_FOUND", "Fornecedor não encontrado.");
  }

  const { quantidade, valorUnitario, ...rest } = patch;
  const [updated] = await db
    .update(itensSuprimento)
    .set({
      ...rest,
      ...(quantidade !== undefined ? { quantidade: String(quantidade) } : {}),
      ...(valorUnitario !== undefined ? { valorUnitario: String(valorUnitario) } : {}),
      updatedAt: new Date(),
    })
    .where(and(eq(itensSuprimento.id, itemId), eq(itensSuprimento.workspaceId, workspaceId), isNull(itensSuprimento.deletedAt)))
    .returning();
  if (!updated) throw notFound("ITEM_SUPRIMENTO_NOT_FOUND", "Item de suprimento não encontrado.");
  return updated;
}

export async function softDeleteItemSuprimento(workspaceId: string, itemId: string) {
  const [deleted] = await db
    .update(itensSuprimento)
    .set({ deletedAt: new Date() })
    .where(and(eq(itensSuprimento.id, itemId), eq(itensSuprimento.workspaceId, workspaceId), isNull(itensSuprimento.deletedAt)))
    .returning();
  if (!deleted) throw notFound("ITEM_SUPRIMENTO_NOT_FOUND", "Item de suprimento não encontrado.");
  return deleted;
}

export async function marcarComprado(workspaceId: string, itemId: string, compradoEm?: string) {
  const item = await getItemSuprimentoOrThrow(workspaceId, itemId);
  if (item.comprado) throw conflict("ITEM_JA_COMPRADO", "Este item já está marcado como comprado.");

  const [updated] = await db
    .update(itensSuprimento)
    .set({ comprado: true, compradoEm: compradoEm ?? new Date().toISOString().slice(0, 10), updatedAt: new Date() })
    .where(eq(itensSuprimento.id, itemId))
    .returning();
  return updated;
}

export async function desmarcarComprado(workspaceId: string, itemId: string) {
  const item = await getItemSuprimentoOrThrow(workspaceId, itemId);
  if (!item.comprado) throw conflict("ITEM_NAO_COMPRADO", "Este item não está marcado como comprado.");

  const [updated] = await db
    .update(itensSuprimento)
    .set({ comprado: false, compradoEm: null, updatedAt: new Date() })
    .where(eq(itensSuprimento.id, itemId))
    .returning();
  return updated;
}

export async function listItemDocumentos(itemId: string) {
  return db
    .select({
      id: itensSuprimentoDocumentos.id,
      documentoId: documentos.id,
      codigoCompleto: documentos.codigoCompleto,
      descricao: documentos.descricao,
    })
    .from(itensSuprimentoDocumentos)
    .innerJoin(documentos, eq(documentos.id, itensSuprimentoDocumentos.documentoId))
    .where(eq(itensSuprimentoDocumentos.itemSuprimentoId, itemId));
}

export async function attachDocumento(workspaceId: string, itemId: string, documentoId: string) {
  const item = await getItemSuprimentoOrThrow(workspaceId, itemId);

  const [documento] = await db
    .select({ id: documentos.id, obraId: documentos.obraId, codigoCompleto: documentos.codigoCompleto })
    .from(documentos)
    .where(and(eq(documentos.id, documentoId), eq(documentos.workspaceId, workspaceId), isNull(documentos.deletedAt)))
    .limit(1);
  if (!documento) throw notFound("DOCUMENTO_NOT_FOUND", "Documento não encontrado.");
  if (documento.obraId !== item.obraId) {
    throw badRequest(
      "DOCUMENTO_OBRA_MISMATCH",
      `Documento ${documento.codigoCompleto} pertence a outra obra, não pode ser vinculado a este item.`
    );
  }

  try {
    const [link] = await db
      .insert(itensSuprimentoDocumentos)
      .values({ id: newId("isd"), itemSuprimentoId: itemId, documentoId })
      .returning();
    return link;
  } catch (err) {
    if (isUniqueViolation(err)) throw conflict("DOCUMENTO_JA_VINCULADO", "Este documento já está vinculado a este item.");
    throw err;
  }
}

export async function detachDocumento(workspaceId: string, itemId: string, documentoId: string) {
  await getItemSuprimentoOrThrow(workspaceId, itemId);
  const deleted = await db
    .delete(itensSuprimentoDocumentos)
    .where(and(eq(itensSuprimentoDocumentos.itemSuprimentoId, itemId), eq(itensSuprimentoDocumentos.documentoId, documentoId)))
    .returning();
  if (deleted.length === 0) throw notFound("VINCULO_NOT_FOUND", "Este documento não está vinculado a este item.");
}
