import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { documentoChatMensagens, documentoChatMencoes, documentos, users } from "@/db/schema";
import { forbidden } from "@/lib/errors";
import { newId } from "@/lib/id";
import { listObraAccessUsers } from "./obraService";

function escaparRegex(texto: string): string {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// A menção é só texto ("@Nome Completo", inserido pelo autocomplete do chat) — aqui o
// servidor descobre quem foi citado casando o nome exato de quem tem acesso à obra do
// documento. Nome mais comprido primeiro (evita "@Ana" casar dentro de "@Ana Paula") e só
// vale se o nome termina em fim de palavra. Não menciona o próprio autor.
async function registrarMencoes(workspaceId: string, documentoId: string, mensagemId: string, autorId: string, corpo: string) {
  if (!corpo.includes("@")) return;
  const [doc] = await db.select({ obraId: documentos.obraId }).from(documentos).where(eq(documentos.id, documentoId)).limit(1);
  if (!doc) return;

  const candidatos = (await listObraAccessUsers(workspaceId, doc.obraId))
    .filter((u) => u.name && u.userId !== autorId)
    .sort((a, b) => b.name!.length - a.name!.length);

  const citados = new Set<string>();
  let restante = corpo;
  for (const u of candidatos) {
    const re = new RegExp(`@${escaparRegex(u.name!)}(?![\\p{L}\\p{N}_])`, "giu");
    if (re.test(restante)) {
      citados.add(u.userId);
      restante = restante.replace(re, " ");
    }
  }
  if (citados.size === 0) return;

  await db
    .insert(documentoChatMencoes)
    .values([...citados].map((usuarioMencionadoId) => ({ id: newId("mnc"), workspaceId, mensagemId, documentoId, usuarioMencionadoId })))
    .onConflictDoNothing();
}

export async function listMencoesPendentes(workspaceId: string, userId: string) {
  return db
    .select({
      id: documentoChatMencoes.id,
      documentoId: documentoChatMencoes.documentoId,
      documentoCodigo: documentos.codigoCompleto,
      corpo: documentoChatMensagens.corpo,
      autorNome: users.name,
      createdAt: documentoChatMencoes.createdAt,
    })
    .from(documentoChatMencoes)
    .innerJoin(documentoChatMensagens, eq(documentoChatMensagens.id, documentoChatMencoes.mensagemId))
    .innerJoin(documentos, eq(documentos.id, documentoChatMencoes.documentoId))
    .leftJoin(users, eq(users.id, documentoChatMensagens.autorId))
    .where(
      and(
        eq(documentoChatMencoes.workspaceId, workspaceId),
        eq(documentoChatMencoes.usuarioMencionadoId, userId),
        eq(documentoChatMencoes.lida, false)
      )
    )
    .orderBy(desc(documentoChatMencoes.createdAt));
}

// `usuarioMencionadoId` no WHERE: só o próprio citado dispensa a sua menção.
export async function marcarMencaoLida(workspaceId: string, userId: string, mencaoId: string) {
  await db
    .update(documentoChatMencoes)
    .set({ lida: true })
    .where(
      and(
        eq(documentoChatMencoes.id, mencaoId),
        eq(documentoChatMencoes.workspaceId, workspaceId),
        eq(documentoChatMencoes.usuarioMencionadoId, userId)
      )
    );
}

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
  await registrarMencoes(workspaceId, documentoId, mensagem.id, autorId, corpo);
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
  await registrarMencoes(workspaceId, documentoId, mensagem.id, autorId, corpo);
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
