import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { grds, grdDocumentos, grdDestinatarios, contadoresGrdSequencial, obras, documentos, revisoes, contatosExternos } from "@/db/schema";
import { newId } from "@/lib/id";
import { ApiError, badRequest, conflict, notFound } from "@/lib/errors";
import { logTimelineEvent } from "./timelineService";

async function logGrdEventoParaDocumentosVinculados(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  input: { workspaceId: string; grdId: string; evento: string; autorId: string | null; extraMetadata?: Record<string, unknown> }
) {
  const vinculados = await tx
    .select({ documentoId: grdDocumentos.documentoId, revisaoId: grdDocumentos.revisaoId })
    .from(grdDocumentos)
    .where(eq(grdDocumentos.grdId, input.grdId));

  for (const v of vinculados) {
    await logTimelineEvent(tx, {
      workspaceId: input.workspaceId,
      documentoId: v.documentoId,
      revisaoId: v.revisaoId,
      evento: input.evento,
      autorId: input.autorId,
      metadata: { grdId: input.grdId, ...input.extraMetadata },
    });
  }
}

export async function createGrd(
  workspaceId: string,
  userId: string,
  input: { obraId: string; dataEmissao: string; documentoIds: string[]; contatoExternoIds: string[] }
) {
  return db.transaction(async (tx) => {
    const [obra] = await tx
      .select({ id: obras.id, code: obras.code })
      .from(obras)
      .where(and(eq(obras.id, input.obraId), eq(obras.workspaceId, workspaceId), isNull(obras.deletedAt)))
      .limit(1);
    if (!obra) throw notFound("OBRA_NOT_FOUND", "Obra não encontrada.");

    // Contador atômico, mesmo padrão do Documento — sequencial por obra, contínuo.
    await tx.insert(contadoresGrdSequencial).values({ obraId: input.obraId, proximoValor: 1 }).onConflictDoNothing();

    const [counter] = await tx
      .update(contadoresGrdSequencial)
      .set({ proximoValor: sql`${contadoresGrdSequencial.proximoValor} + 1` })
      .where(eq(contadoresGrdSequencial.obraId, input.obraId))
      .returning({ proximoValor: contadoresGrdSequencial.proximoValor });
    if (!counter) throw new ApiError(500, "SEQUENCIAL_GENERATION_FAILED", "Falha ao gerar o sequencial do GRD.");

    const numeroSequencial = counter.proximoValor - 1;
    const codigoCompleto = `GRD-${obra.code}-${String(numeroSequencial).padStart(3, "0")}`;

    const [grd] = await tx
      .insert(grds)
      .values({
        id: newId("grd"),
        workspaceId,
        obraId: input.obraId,
        numeroSequencial,
        codigoCompleto,
        dataEmissao: input.dataEmissao,
        criadoPor: userId,
      })
      .returning();

    // A revisão nunca vem do cliente — sempre a revisão atual do documento no momento
    // da criação do GRD. Isso também é o que garante que documento e revisão nunca
    // podem ficar inconsistentes entre si.
    for (const documentoId of input.documentoIds) {
      const [documento] = await tx
        .select({ id: documentos.id, obraId: documentos.obraId, codigoCompleto: documentos.codigoCompleto, currentRevisionId: documentos.currentRevisionId })
        .from(documentos)
        .where(and(eq(documentos.id, documentoId), eq(documentos.workspaceId, workspaceId), isNull(documentos.deletedAt)))
        .limit(1);
      if (!documento) throw notFound("DOCUMENTO_NOT_FOUND", `Documento ${documentoId} não encontrado.`);

      if (documento.obraId !== input.obraId) {
        throw badRequest(
          "DOCUMENTO_OBRA_MISMATCH",
          `Documento ${documento.codigoCompleto} pertence a outra obra, não pode entrar neste GRD.`
        );
      }
      if (!documento.currentRevisionId) {
        throw badRequest("DOCUMENTO_SEM_REVISAO_ATUAL", `Documento ${documento.codigoCompleto} ainda não tem nenhuma revisão criada.`);
      }

      await tx.insert(grdDocumentos).values({
        id: newId("gdoc"),
        grdId: grd.id,
        documentoId: documento.id,
        revisaoId: documento.currentRevisionId,
      });
    }

    for (const contatoExternoId of input.contatoExternoIds) {
      const [contato] = await tx
        .select({ id: contatosExternos.id })
        .from(contatosExternos)
        .where(and(eq(contatosExternos.id, contatoExternoId), eq(contatosExternos.workspaceId, workspaceId), isNull(contatosExternos.deletedAt)))
        .limit(1);
      if (!contato) throw notFound("CONTATO_NOT_FOUND", `Contato ${contatoExternoId} não encontrado.`);

      await tx.insert(grdDestinatarios).values({ id: newId("gdest"), grdId: grd.id, contatoExternoId });
    }

    await logGrdEventoParaDocumentosVinculados(tx, {
      workspaceId,
      grdId: grd.id,
      evento: "grd_criado",
      autorId: userId,
      extraMetadata: { codigoCompleto: grd.codigoCompleto },
    });

    return grd;
  });
}

export async function listGrds(workspaceId: string, filters: { obraId?: string; status?: "pendente" | "respondido" | "cancelado" }) {
  const conditions = [eq(grds.workspaceId, workspaceId), isNull(grds.deletedAt)];
  if (filters.obraId) conditions.push(eq(grds.obraId, filters.obraId));
  if (filters.status) conditions.push(eq(grds.status, filters.status));

  return db
    .select()
    .from(grds)
    .where(and(...conditions))
    .orderBy(desc(grds.createdAt));
}

export async function getGrdOrThrow(workspaceId: string, grdId: string) {
  const [grd] = await db
    .select()
    .from(grds)
    .where(and(eq(grds.id, grdId), eq(grds.workspaceId, workspaceId), isNull(grds.deletedAt)))
    .limit(1);
  if (!grd) throw notFound("GRD_NOT_FOUND", "GRD não encontrado.");
  return grd;
}

export async function listGrdDocumentos(grdId: string) {
  return db
    .select({
      id: grdDocumentos.id,
      documentoId: documentos.id,
      codigoCompleto: documentos.codigoCompleto,
      descricao: documentos.descricao,
      revisaoId: revisoes.id,
      revisaoLabel: revisoes.label,
    })
    .from(grdDocumentos)
    .innerJoin(documentos, eq(documentos.id, grdDocumentos.documentoId))
    .innerJoin(revisoes, eq(revisoes.id, grdDocumentos.revisaoId))
    .where(eq(grdDocumentos.grdId, grdId));
}

export async function listGrdDestinatarios(grdId: string) {
  return db
    .select({
      id: grdDestinatarios.id,
      contatoExternoId: contatosExternos.id,
      nome: contatosExternos.nome,
      email: contatosExternos.email,
      empresa: contatosExternos.empresa,
    })
    .from(grdDestinatarios)
    .innerJoin(contatosExternos, eq(contatosExternos.id, grdDestinatarios.contatoExternoId))
    .where(eq(grdDestinatarios.grdId, grdId));
}

export async function responderGrd(
  workspaceId: string,
  grdId: string,
  userId: string,
  input: { arquivoRespostaNome?: string; arquivoRespostaUrl: string }
) {
  const grd = await getGrdOrThrow(workspaceId, grdId);
  if (grd.status !== "pendente") {
    throw conflict("GRD_STATUS_INVALIDO", `GRD em status '${grd.status}' não pode ser respondido.`);
  }

  return db.transaction(async (tx) => {
    const [updated] = await tx
      .update(grds)
      .set({
        status: "respondido",
        respondidoEm: new Date(),
        arquivoRespostaNome: input.arquivoRespostaNome,
        arquivoRespostaUrl: input.arquivoRespostaUrl,
        updatedAt: new Date(),
      })
      .where(eq(grds.id, grdId))
      .returning();

    await logGrdEventoParaDocumentosVinculados(tx, {
      workspaceId,
      grdId,
      evento: "grd_respondido",
      autorId: userId,
      extraMetadata: { codigoCompleto: grd.codigoCompleto },
    });

    return updated;
  });
}

export async function cancelarGrd(workspaceId: string, grdId: string, userId: string) {
  const grd = await getGrdOrThrow(workspaceId, grdId);
  if (grd.status !== "pendente") {
    throw conflict("GRD_STATUS_INVALIDO", `GRD em status '${grd.status}' não pode ser cancelado.`);
  }

  return db.transaction(async (tx) => {
    const [updated] = await tx
      .update(grds)
      .set({ status: "cancelado", updatedAt: new Date() })
      .where(eq(grds.id, grdId))
      .returning();

    await logGrdEventoParaDocumentosVinculados(tx, {
      workspaceId,
      grdId,
      evento: "grd_cancelado",
      autorId: userId,
      extraMetadata: { codigoCompleto: grd.codigoCompleto },
    });

    return updated;
  });
}
