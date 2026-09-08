import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { documentoChatMensagens, users } from "@/db/schema";
import { newId } from "@/lib/id";

export async function listMensagensChat(workspaceId: string, documentoId: string) {
  return db
    .select({
      id: documentoChatMensagens.id,
      corpo: documentoChatMensagens.corpo,
      createdAt: documentoChatMensagens.createdAt,
      autorId: documentoChatMensagens.autorId,
      autorNome: users.name,
    })
    .from(documentoChatMensagens)
    .leftJoin(users, eq(users.id, documentoChatMensagens.autorId))
    .where(and(eq(documentoChatMensagens.workspaceId, workspaceId), eq(documentoChatMensagens.documentoId, documentoId)))
    .orderBy(asc(documentoChatMensagens.createdAt));
}

export async function createMensagemChat(workspaceId: string, documentoId: string, autorId: string, corpo: string) {
  const [mensagem] = await db
    .insert(documentoChatMensagens)
    .values({ id: newId("chat"), workspaceId, documentoId, autorId, corpo })
    .returning();
  return mensagem;
}
