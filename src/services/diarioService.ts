import { and, eq, desc } from "drizzle-orm";
import { db } from "@/db/client";
import { diarioEntradas, documentos } from "@/db/schema";
import { forbidden, badRequest } from "@/lib/errors";
import { newId } from "@/lib/id";

export type EntradaDiario = {
  id: string;
  data: string;
  texto: string;
  documentoId: string | null;
  documentoCodigo: string | null;
  documentoDescricao: string | null;
  createdAt: Date;
  updatedAt: Date;
};

// Diário é estritamente privado — TODA query aqui filtra por userId (o dono), sem exceção
// nem pra administrador. Não existe "ver o diário de outra pessoa" no sistema.
export async function listEntradasDiario(workspaceId: string, userId: string): Promise<EntradaDiario[]> {
  return db
    .select({
      id: diarioEntradas.id,
      data: diarioEntradas.data,
      texto: diarioEntradas.texto,
      documentoId: diarioEntradas.documentoId,
      documentoCodigo: documentos.codigoCompleto,
      documentoDescricao: documentos.descricao,
      createdAt: diarioEntradas.createdAt,
      updatedAt: diarioEntradas.updatedAt,
    })
    .from(diarioEntradas)
    .leftJoin(documentos, eq(documentos.id, diarioEntradas.documentoId))
    .where(and(eq(diarioEntradas.workspaceId, workspaceId), eq(diarioEntradas.userId, userId)))
    .orderBy(desc(diarioEntradas.data), desc(diarioEntradas.createdAt));
}

export async function createEntradaDiario(
  workspaceId: string,
  userId: string,
  input: { data: string; texto: string; documentoId?: string | null }
) {
  const texto = input.texto.trim();
  if (!texto) throw badRequest("DIARIO_TEXTO_VAZIO", "Escreva alguma coisa antes de salvar.");
  if (!input.data) throw badRequest("DIARIO_SEM_DATA", "Escolha a data do registro.");

  const [entrada] = await db
    .insert(diarioEntradas)
    .values({ id: newId("diario"), workspaceId, userId, data: input.data, texto, documentoId: input.documentoId || null })
    .returning();
  return entrada;
}

// `userId` no WHERE garante que ninguém edita entrada alheia mesmo forjando o id no formulário
// — mesmo padrão já usado no chat do documento (updateMensagemChat).
export async function updateEntradaDiario(
  workspaceId: string,
  userId: string,
  entradaId: string,
  input: { texto?: string; data?: string; documentoId?: string | null }
) {
  const patch: { texto?: string; data?: string; documentoId?: string | null; updatedAt: Date } = { updatedAt: new Date() };
  if (input.texto !== undefined) {
    const texto = input.texto.trim();
    if (!texto) throw badRequest("DIARIO_TEXTO_VAZIO", "Escreva alguma coisa antes de salvar.");
    patch.texto = texto;
  }
  if (input.data !== undefined) patch.data = input.data;
  if (input.documentoId !== undefined) patch.documentoId = input.documentoId || null;

  const [entrada] = await db
    .update(diarioEntradas)
    .set(patch)
    .where(and(eq(diarioEntradas.id, entradaId), eq(diarioEntradas.workspaceId, workspaceId), eq(diarioEntradas.userId, userId)))
    .returning();
  if (!entrada) throw forbidden("DIARIO_EDIT_DENIED", "Você só pode editar as suas próprias entradas.");
  return entrada;
}

export async function deleteEntradaDiario(workspaceId: string, userId: string, entradaId: string) {
  const res = await db
    .delete(diarioEntradas)
    .where(and(eq(diarioEntradas.id, entradaId), eq(diarioEntradas.workspaceId, workspaceId), eq(diarioEntradas.userId, userId)))
    .returning({ id: diarioEntradas.id });
  if (res.length === 0) throw forbidden("DIARIO_DELETE_DENIED", "Você só pode excluir as suas próprias entradas.");
}
