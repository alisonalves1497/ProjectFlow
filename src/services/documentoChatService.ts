import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { documentoChatMensagens, users } from "@/db/schema";
import { forbidden } from "@/lib/errors";
import { newId } from "@/lib/id";

export async function listMensagensChat(workspaceId: string, documentoId: string) {
  return db
    .select({
      id: documentoChatMensagens.id,
      corpo: documentoChatMensagens.corpo,
      createdAt: documentoChatMensagens.createdAt,
      editedAt: documentoChatMensagens.editedAt,
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

// Edição é privilégio exclusivo de quem escreveu — o `autorId` no WHERE garante que ninguém
// edita mensagem alheia mesmo que forje o id no formulário.
export async function updateMensagemChat(
  workspaceId: string,
  documentoId: string,
  mensagemId: string,
  autorId: string,
  corpo: string
) {
  const [mensagem] = await db
    .update(documentoChatMensagens)
    .set({ corpo, editedAt: new Date() })
    .where(
      and(
        eq(documentoChatMensagens.id, mensagemId),
        eq(documentoChatMensagens.workspaceId, workspaceId),
        eq(documentoChatMensagens.documentoId, documentoId),
        eq(documentoChatMensagens.autorId, autorId)
      )
    )
    .returning();
  if (!mensagem) throw forbidden("CHAT_MENSAGEM_EDIT_DENIED", "Você só pode editar as suas próprias mensagens.");
  return mensagem;
}

// Exclusão definitiva — a checagem de administrador fica na action que chama isto.
export async function deleteMensagemChat(workspaceId: string, documentoId: string, mensagemId: string) {
  await db
    .delete(documentoChatMensagens)
    .where(
      and(
        eq(documentoChatMensagens.id, mensagemId),
        eq(documentoChatMensagens.workspaceId, workspaceId),
        eq(documentoChatMensagens.documentoId, documentoId)
      )
    );
}
