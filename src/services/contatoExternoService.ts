import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { contatosExternos } from "@/db/schema";
import { newId } from "@/lib/id";
import { notFound } from "@/lib/errors";

export async function createContatoExterno(
  workspaceId: string,
  input: { nome: string; email: string; empresa?: string; telefone?: string }
) {
  const [contato] = await db
    .insert(contatosExternos)
    .values({ id: newId("cext"), workspaceId, ...input })
    .returning();
  return contato;
}

export async function listContatosExternos(workspaceId: string) {
  return db
    .select()
    .from(contatosExternos)
    .where(and(eq(contatosExternos.workspaceId, workspaceId), isNull(contatosExternos.deletedAt)));
}

export async function getContatoExternoOrThrow(workspaceId: string, contatoId: string) {
  const [contato] = await db
    .select()
    .from(contatosExternos)
    .where(and(eq(contatosExternos.id, contatoId), eq(contatosExternos.workspaceId, workspaceId), isNull(contatosExternos.deletedAt)))
    .limit(1);
  if (!contato) throw notFound("CONTATO_NOT_FOUND", "Contato externo não encontrado.");
  return contato;
}
