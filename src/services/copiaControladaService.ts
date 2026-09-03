import { and, eq, isNull } from "drizzle-orm";
import { db, type db as Db } from "@/db/client";
import { copiasControladas, documentos, revisoes, users, obras } from "@/db/schema";
import { newId } from "@/lib/id";
import { badRequest, conflict, notFound, isUniqueViolation } from "@/lib/errors";
import { logTimelineEvent } from "./timelineService";
import { listObraAccessUsers } from "./obraService";

type Tx = Parameters<Parameters<typeof Db.transaction>[0]>[0];

// "a_substituir" nunca é gravado — é sempre revisaoId (travada aqui) comparada
// com a revisão atual do documento, no momento da leitura.
export type StatusEfetivoCopiaControlada = "ativa" | "a_substituir" | "substituida" | "cancelada";

function statusEfetivo(status: "ativa" | "substituida" | "cancelada", copiaRevisaoId: string, documentoRevisaoAtualId: string | null): StatusEfetivoCopiaControlada {
  if (status !== "ativa") return status;
  return copiaRevisaoId !== documentoRevisaoAtualId ? "a_substituir" : "ativa";
}

async function assertDetentorTemAcessoObra(workspaceId: string, obraId: string, detentorId: string) {
  const usuarios = await listObraAccessUsers(workspaceId, obraId);
  if (!usuarios.some((u) => u.userId === detentorId)) {
    throw badRequest("DETENTOR_SEM_ACESSO_OBRA", "O detentor precisa ter acesso a esta obra.");
  }
}

export async function createCopiaControlada(workspaceId: string, userId: string, input: { documentoId: string; detentorId: string }) {
  const [documento] = await db
    .select({ id: documentos.id, obraId: documentos.obraId, currentRevisionId: documentos.currentRevisionId, codigoCompleto: documentos.codigoCompleto })
    .from(documentos)
    .where(and(eq(documentos.id, input.documentoId), eq(documentos.workspaceId, workspaceId), isNull(documentos.deletedAt)))
    .limit(1);
  if (!documento) throw notFound("DOCUMENTO_NOT_FOUND", "Documento não encontrado.");
  if (!documento.currentRevisionId) {
    throw badRequest("DOCUMENTO_SEM_REVISAO_ATUAL", `Documento ${documento.codigoCompleto} ainda não tem nenhuma revisão criada.`);
  }

  await assertDetentorTemAcessoObra(workspaceId, documento.obraId, input.detentorId);

  return db.transaction(async (tx) => {
    let copia;
    try {
      [copia] = await tx
        .insert(copiasControladas)
        .values({
          id: newId("cc"),
          workspaceId,
          obraId: documento.obraId,
          documentoId: documento.id,
          revisaoId: documento.currentRevisionId!,
          detentorId: input.detentorId,
          createdBy: userId,
        })
        .returning();
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw conflict("COPIA_CONTROLADA_JA_ATIVA", "Este detentor já tem uma cópia controlada ativa deste documento.");
      }
      throw err;
    }

    await logTimelineEvent(tx, {
      workspaceId,
      documentoId: documento.id,
      revisaoId: copia.revisaoId,
      evento: "copia_controlada_criada",
      autorId: userId,
      metadata: { copiaId: copia.id, detentorId: input.detentorId },
    });

    return copia;
  });
}

export async function listCopiasControladas(workspaceId: string, filters: { obraId?: string; documentoId?: string }) {
  const conditions = [eq(copiasControladas.workspaceId, workspaceId)];
  if (filters.obraId) conditions.push(eq(copiasControladas.obraId, filters.obraId));
  if (filters.documentoId) conditions.push(eq(copiasControladas.documentoId, filters.documentoId));

  const rows = await db
    .select({
      id: copiasControladas.id,
      documentoId: copiasControladas.documentoId,
      documentoCodigo: documentos.codigoCompleto,
      documentoRevisaoAtualId: documentos.currentRevisionId,
      revisaoId: copiasControladas.revisaoId,
      revisaoLabel: revisoes.label,
      detentorId: copiasControladas.detentorId,
      detentorNome: users.name,
      detentorEmail: users.email,
      status: copiasControladas.status,
      substituiuCopiaId: copiasControladas.substituiuCopiaId,
      dataFechamento: copiasControladas.dataFechamento,
      createdAt: copiasControladas.createdAt,
    })
    .from(copiasControladas)
    .innerJoin(documentos, eq(documentos.id, copiasControladas.documentoId))
    .innerJoin(revisoes, eq(revisoes.id, copiasControladas.revisaoId))
    .innerJoin(users, eq(users.id, copiasControladas.detentorId))
    .where(and(...conditions));

  return rows.map((r) => ({ ...r, statusEfetivo: statusEfetivo(r.status, r.revisaoId, r.documentoRevisaoAtualId) }));
}

export async function getCopiaControladaOrThrow(workspaceId: string, copiaId: string) {
  const [copia] = await db
    .select()
    .from(copiasControladas)
    .where(and(eq(copiasControladas.id, copiaId), eq(copiasControladas.workspaceId, workspaceId)))
    .limit(1);
  if (!copia) throw notFound("COPIA_CONTROLADA_NOT_FOUND", "Cópia controlada não encontrada.");
  return copia;
}

export async function trocarCopiaControlada(workspaceId: string, userId: string, copiaId: string) {
  const copia = await getCopiaControladaOrThrow(workspaceId, copiaId);
  if (copia.status !== "ativa") {
    throw conflict("COPIA_CONTROLADA_STATUS_INVALIDO", `Cópia em status '${copia.status}' não pode ser trocada.`);
  }

  const [documento] = await db
    .select({ id: documentos.id, currentRevisionId: documentos.currentRevisionId })
    .from(documentos)
    .where(eq(documentos.id, copia.documentoId))
    .limit(1);
  if (!documento?.currentRevisionId) throw notFound("DOCUMENTO_NOT_FOUND", "Documento não encontrado.");

  if (documento.currentRevisionId === copia.revisaoId) {
    throw conflict("COPIA_CONTROLADA_JA_ATUALIZADA", "Esta cópia já está na revisão atual do documento — não há o que substituir.");
  }

  return db.transaction(async (tx) => {
    const agora = new Date();

    await tx
      .update(copiasControladas)
      .set({ status: "substituida", dataFechamento: agora, updatedAt: agora })
      .where(eq(copiasControladas.id, copia.id));

    let nova;
    try {
      [nova] = await tx
        .insert(copiasControladas)
        .values({
          id: newId("cc"),
          workspaceId,
          obraId: copia.obraId,
          documentoId: copia.documentoId,
          revisaoId: documento.currentRevisionId!,
          detentorId: copia.detentorId,
          substituiuCopiaId: copia.id,
          createdBy: userId,
        })
        .returning();
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw conflict("COPIA_CONTROLADA_JA_ATIVA", "Este detentor já tem uma cópia controlada ativa deste documento.");
      }
      throw err;
    }

    await logTimelineEvent(tx, {
      workspaceId,
      documentoId: copia.documentoId,
      revisaoId: nova.revisaoId,
      evento: "copia_controlada_substituida",
      autorId: userId,
      metadata: { copiaAnteriorId: copia.id, copiaNovaId: nova.id, detentorId: copia.detentorId },
    });

    return nova;
  });
}

export async function cancelarCopiaControlada(workspaceId: string, userId: string, copiaId: string) {
  const copia = await getCopiaControladaOrThrow(workspaceId, copiaId);
  if (copia.status !== "ativa") {
    throw conflict("COPIA_CONTROLADA_STATUS_INVALIDO", `Cópia em status '${copia.status}' não pode ser cancelada.`);
  }

  return db.transaction(async (tx) => {
    const agora = new Date();
    const [atualizada] = await tx
      .update(copiasControladas)
      .set({ status: "cancelada", dataFechamento: agora, updatedAt: agora })
      .where(eq(copiasControladas.id, copiaId))
      .returning();

    await logTimelineEvent(tx, {
      workspaceId,
      documentoId: copia.documentoId,
      revisaoId: copia.revisaoId,
      evento: "copia_controlada_cancelada",
      autorId: userId,
      metadata: { copiaId: copia.id, detentorId: copia.detentorId },
    });

    return atualizada;
  });
}

export async function getCopiasControladasDashboard(workspaceId: string, obraId: string) {
  const [obra] = await db
    .select({ id: obras.id })
    .from(obras)
    .where(and(eq(obras.id, obraId), eq(obras.workspaceId, workspaceId), isNull(obras.deletedAt)))
    .limit(1);
  if (!obra) throw notFound("OBRA_NOT_FOUND", "Obra não encontrada.");

  const copias = await db
    .select({
      id: copiasControladas.id,
      status: copiasControladas.status,
      revisaoId: copiasControladas.revisaoId,
      detentorId: copiasControladas.detentorId,
      documentoRevisaoAtualId: documentos.currentRevisionId,
      createdAt: copiasControladas.createdAt,
      dataFechamento: copiasControladas.dataFechamento,
    })
    .from(copiasControladas)
    .innerJoin(documentos, eq(documentos.id, copiasControladas.documentoId))
    .where(and(eq(copiasControladas.workspaceId, workspaceId), eq(copiasControladas.obraId, obraId)));

  const ativas = copias.filter((c) => c.status === "ativa");
  const aSubstituir = ativas.filter((c) => c.revisaoId !== c.documentoRevisaoAtualId);
  const percentualDesatualizadas = ativas.length > 0 ? (aSubstituir.length / ativas.length) * 100 : 0;

  const substituidas = copias.filter((c) => c.status === "substituida" && c.dataFechamento);
  const tempoMedioTrocaDias =
    substituidas.length > 0
      ? substituidas.reduce((sum, c) => sum + (c.dataFechamento!.getTime() - c.createdAt.getTime()) / 86_400_000, 0) / substituidas.length
      : null;

  const detentoresDistintos = new Set(ativas.map((c) => c.detentorId)).size;

  return {
    copiasAtivas: ativas.length,
    copiasASubstituir: aSubstituir.length,
    percentualDesatualizadas,
    tempoMedioTrocaDias,
    detentoresDistintos,
  };
}
