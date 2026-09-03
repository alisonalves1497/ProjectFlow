import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { comentarios, revisoes } from "@/db/schema";
import { newId } from "@/lib/id";
import { notFound } from "@/lib/errors";
import { logTimelineEvent } from "./timelineService";

export async function listComentarios(workspaceId: string, revisaoId: string) {
  return db
    .select()
    .from(comentarios)
    .where(and(eq(comentarios.workspaceId, workspaceId), eq(comentarios.revisaoId, revisaoId)))
    .orderBy(asc(comentarios.createdAt));
}

export async function createComentario(
  workspaceId: string,
  documentoId: string,
  revisaoId: string,
  autorId: string,
  input: { corpo: string; anexoNome?: string; anexoUrl?: string; marcarPendenciaCliente?: boolean }
) {
  return db.transaction(async (tx) => {
    const [revisao] = await tx
      .select({ id: revisoes.id })
      .from(revisoes)
      .where(and(eq(revisoes.id, revisaoId), eq(revisoes.documentoId, documentoId), eq(revisoes.workspaceId, workspaceId)))
      .limit(1);
    if (!revisao) throw notFound("REVISAO_NOT_FOUND", "Revisão não encontrada.");

    const [comentario] = await tx
      .insert(comentarios)
      .values({
        id: newId("cmt"),
        workspaceId,
        revisaoId,
        autorId,
        corpo: input.corpo,
        anexoNome: input.anexoNome,
        anexoUrl: input.anexoUrl,
        marcarPendenciaCliente: input.marcarPendenciaCliente ?? false,
      })
      .returning();

    await logTimelineEvent(tx, {
      workspaceId,
      documentoId,
      revisaoId,
      evento: "comentario_adicionado",
      autorId,
      metadata: { comentarioId: comentario.id },
    });

    return comentario;
  });
}
