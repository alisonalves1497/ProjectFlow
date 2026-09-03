import { and, eq, gt, isNotNull, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { projetos, obras } from "@/db/schema";
import { newId } from "@/lib/id";
import { conflict, notFound } from "@/lib/errors";
import { softDeleteDocumentosPorObra, restoreDocumentosPorObra } from "./documentoService";

const RETENCAO_LIXEIRA_DIAS = 30;

export async function createProjeto(workspaceId: string, input: { code: string; name: string }) {
  const [existing] = await db
    .select({ id: projetos.id })
    .from(projetos)
    .where(and(eq(projetos.workspaceId, workspaceId), eq(projetos.code, input.code)))
    .limit(1);
  if (existing) throw conflict("PROJETO_CODE_TAKEN", "Já existe um projeto com este código neste workspace.");

  const [projeto] = await db
    .insert(projetos)
    .values({ id: newId("proj"), workspaceId, code: input.code, name: input.name })
    .returning();
  return projeto;
}

export async function listProjetos(workspaceId: string) {
  return db
    .select()
    .from(projetos)
    .where(and(eq(projetos.workspaceId, workspaceId), isNull(projetos.deletedAt)));
}

export async function getProjetoOrThrow(workspaceId: string, projetoId: string) {
  const [projeto] = await db
    .select()
    .from(projetos)
    .where(and(eq(projetos.id, projetoId), eq(projetos.workspaceId, workspaceId), isNull(projetos.deletedAt)))
    .limit(1);
  if (!projeto) throw notFound("PROJETO_NOT_FOUND", "Projeto não encontrado.");
  return projeto;
}

export async function updateProjeto(workspaceId: string, projetoId: string, patch: { name?: string }) {
  const [updated] = await db
    .update(projetos)
    .set({ ...patch, updatedAt: new Date() })
    .where(and(eq(projetos.id, projetoId), eq(projetos.workspaceId, workspaceId), isNull(projetos.deletedAt)))
    .returning();
  if (!updated) throw notFound("PROJETO_NOT_FOUND", "Projeto não encontrado.");
  return updated;
}

// Cascata completa: Projeto, suas Obras e os documentos de cada uma levam o MESMO
// deletedAt — restaurar o Projeto restaura tudo que foi apagado junto (ver restoreProjeto).
export async function softDeleteProjeto(workspaceId: string, projetoId: string) {
  return db.transaction(async (tx) => {
    const deletedAt = new Date();
    const [deleted] = await tx
      .update(projetos)
      .set({ deletedAt })
      .where(and(eq(projetos.id, projetoId), eq(projetos.workspaceId, workspaceId), isNull(projetos.deletedAt)))
      .returning();
    if (!deleted) throw notFound("PROJETO_NOT_FOUND", "Projeto não encontrado.");

    const obrasDoProjeto = await tx
      .select({ id: obras.id })
      .from(obras)
      .where(and(eq(obras.projetoId, projetoId), isNull(obras.deletedAt)));

    await tx.update(obras).set({ deletedAt }).where(and(eq(obras.projetoId, projetoId), isNull(obras.deletedAt)));
    for (const obra of obrasDoProjeto) {
      await softDeleteDocumentosPorObra(tx, obra.id, deletedAt);
    }

    return deleted;
  });
}

export async function restoreProjeto(workspaceId: string, projetoId: string) {
  const [projeto] = await db
    .select()
    .from(projetos)
    .where(and(eq(projetos.id, projetoId), eq(projetos.workspaceId, workspaceId), isNotNull(projetos.deletedAt)))
    .limit(1);
  if (!projeto || !projeto.deletedAt) throw notFound("PROJETO_NOT_FOUND", "Projeto excluído não encontrado.");
  const deletedAt = projeto.deletedAt;

  return db.transaction(async (tx) => {
    const [restaurado] = await tx.update(projetos).set({ deletedAt: null }).where(eq(projetos.id, projetoId)).returning();

    const obrasCascata = await tx
      .select({ id: obras.id })
      .from(obras)
      .where(and(eq(obras.projetoId, projetoId), eq(obras.deletedAt, deletedAt)));

    await tx.update(obras).set({ deletedAt: null }).where(and(eq(obras.projetoId, projetoId), eq(obras.deletedAt, deletedAt)));
    for (const obra of obrasCascata) {
      await restoreDocumentosPorObra(tx, obra.id, deletedAt);
    }

    return restaurado;
  });
}

export async function listProjetosExcluidos(workspaceId: string) {
  const limite = new Date(Date.now() - RETENCAO_LIXEIRA_DIAS * 24 * 60 * 60 * 1000);
  return db
    .select()
    .from(projetos)
    .where(and(eq(projetos.workspaceId, workspaceId), isNotNull(projetos.deletedAt), gt(projetos.deletedAt, limite)));
}
