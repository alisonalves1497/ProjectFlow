import { and, asc, eq, getTableColumns } from "drizzle-orm";
import { db, type db as Db } from "@/db/client";
import { linhaDoTempo, users } from "@/db/schema";
import { newId } from "@/lib/id";

type Tx = Parameters<Parameters<typeof Db.transaction>[0]>[0];

export async function listTimeline(workspaceId: string, documentoId: string) {
  return db
    .select()
    .from(linhaDoTempo)
    .where(and(eq(linhaDoTempo.workspaceId, workspaceId), eq(linhaDoTempo.documentoId, documentoId)))
    .orderBy(asc(linhaDoTempo.createdAt));
}

// Mesma listagem, mas com o nome do autor já resolvido — usado na aba "Linha do tempo"
// do detalhe do documento, que mostra "Rev. XX evento · data · autor" por linha.
export async function listTimelineComAutorNome(workspaceId: string, documentoId: string) {
  return db
    .select({ ...getTableColumns(linhaDoTempo), autorNome: users.name })
    .from(linhaDoTempo)
    .leftJoin(users, eq(users.id, linhaDoTempo.autorId))
    .where(and(eq(linhaDoTempo.workspaceId, workspaceId), eq(linhaDoTempo.documentoId, documentoId)))
    .orderBy(asc(linhaDoTempo.createdAt));
}

export async function logTimelineEvent(
  tx: Tx,
  input: {
    workspaceId: string;
    documentoId: string;
    revisaoId?: string | null;
    evento: string;
    autorId: string | null;
    metadata?: Record<string, unknown>;
  }
) {
  await tx.insert(linhaDoTempo).values({
    id: newId("tl"),
    workspaceId: input.workspaceId,
    documentoId: input.documentoId,
    revisaoId: input.revisaoId ?? null,
    evento: input.evento,
    autorId: input.autorId,
    metadata: input.metadata ?? null,
  });
}
