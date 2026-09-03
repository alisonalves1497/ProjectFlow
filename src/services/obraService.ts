import { and, eq, gt, isNotNull, isNull, or } from "drizzle-orm";
import { db } from "@/db/client";
import { obras, obraMembers, users, projetos, workspaceMembers } from "@/db/schema";
import { newId } from "@/lib/id";
import { conflict, notFound } from "@/lib/errors";
import { softDeleteDocumentosPorObra, restoreDocumentosPorObra } from "./documentoService";

const RETENCAO_LIXEIRA_DIAS = 30;

// criadoPorUserId ganha acesso explícito (obra_members) automaticamente — quem cria não
// é necessariamente administrador (ex: coordenador), então sem isso perderia acesso à
// própria obra assim que criada.
export async function createObra(
  workspaceId: string,
  projetoId: string,
  input: { code: string; name: string },
  criadoPorUserId: string
) {
  const [projeto] = await db
    .select({ id: projetos.id })
    .from(projetos)
    .where(and(eq(projetos.id, projetoId), eq(projetos.workspaceId, workspaceId), isNull(projetos.deletedAt)))
    .limit(1);
  if (!projeto) throw notFound("PROJETO_NOT_FOUND", "Projeto não encontrado.");

  const [existing] = await db
    .select({ id: obras.id })
    .from(obras)
    .where(and(eq(obras.projetoId, projetoId), eq(obras.code, input.code)))
    .limit(1);
  if (existing) throw conflict("OBRA_CODE_TAKEN", "Já existe uma obra com este código neste projeto.");

  return db.transaction(async (tx) => {
    const [obra] = await tx
      .insert(obras)
      .values({ id: newId("obra"), workspaceId, projetoId, code: input.code, name: input.name })
      .returning();
    await tx.insert(obraMembers).values({ id: newId("obm"), obraId: obra.id, userId: criadoPorUserId });
    return obra;
  });
}

export async function listObras(workspaceId: string, projetoId: string) {
  return db
    .select()
    .from(obras)
    .where(and(eq(obras.workspaceId, workspaceId), eq(obras.projetoId, projetoId), isNull(obras.deletedAt)));
}

// IDs de obra que este usuário tem acesso explícito via obra_members (usado quando
// o papel no workspace é 'member', que não vê todas as obras por padrão).
export async function listAccessibleObraIds(userId: string): Promise<string[]> {
  const rows = await db.select({ obraId: obraMembers.obraId }).from(obraMembers).where(eq(obraMembers.userId, userId));
  return rows.map((r) => r.obraId);
}

export async function getObraOrThrow(workspaceId: string, obraId: string) {
  const [obra] = await db
    .select()
    .from(obras)
    .where(and(eq(obras.id, obraId), eq(obras.workspaceId, workspaceId), isNull(obras.deletedAt)))
    .limit(1);
  if (!obra) throw notFound("OBRA_NOT_FOUND", "Obra não encontrada.");
  return obra;
}

export async function updateObra(workspaceId: string, obraId: string, patch: { name?: string }) {
  const [updated] = await db
    .update(obras)
    .set({ ...patch, updatedAt: new Date() })
    .where(and(eq(obras.id, obraId), eq(obras.workspaceId, workspaceId), isNull(obras.deletedAt)))
    .returning();
  if (!updated) throw notFound("OBRA_NOT_FOUND", "Obra não encontrada.");
  return updated;
}

// Exclusão em cascata: a obra e todos os seus documentos levam o MESMO deletedAt,
// pra restauração conseguir reverter exatamente o que essa exclusão apagou (e não,
// por exemplo, reviver um documento que já tinha sido excluído antes por conta própria).
export async function softDeleteObra(workspaceId: string, obraId: string) {
  return db.transaction(async (tx) => {
    const deletedAt = new Date();
    const [deleted] = await tx
      .update(obras)
      .set({ deletedAt })
      .where(and(eq(obras.id, obraId), eq(obras.workspaceId, workspaceId), isNull(obras.deletedAt)))
      .returning();
    if (!deleted) throw notFound("OBRA_NOT_FOUND", "Obra não encontrada.");
    await softDeleteDocumentosPorObra(tx, obraId, deletedAt);
    return deleted;
  });
}

export async function restoreObra(workspaceId: string, obraId: string) {
  const [obra] = await db
    .select()
    .from(obras)
    .where(and(eq(obras.id, obraId), eq(obras.workspaceId, workspaceId), isNotNull(obras.deletedAt)))
    .limit(1);
  if (!obra || !obra.deletedAt) throw notFound("OBRA_NOT_FOUND", "Obra excluída não encontrada.");

  return db.transaction(async (tx) => {
    const [restaurada] = await tx.update(obras).set({ deletedAt: null }).where(eq(obras.id, obraId)).returning();
    await restoreDocumentosPorObra(tx, obraId, obra.deletedAt!);
    return restaurada;
  });
}

// Obras excluídas nos últimos 30 dias que NÃO fazem parte da exclusão em cascata de um
// Projeto (aí a Lixeira de Projetos já cobre) — ou seja, foram excluídas isoladamente.
export async function listObrasExcluidas(workspaceId: string) {
  const limite = new Date(Date.now() - RETENCAO_LIXEIRA_DIAS * 24 * 60 * 60 * 1000);
  const rows = await db
    .select({ obra: obras, projetoDeletedAt: projetos.deletedAt, projetoNome: projetos.name })
    .from(obras)
    .innerJoin(projetos, eq(projetos.id, obras.projetoId))
    .where(and(eq(obras.workspaceId, workspaceId), isNotNull(obras.deletedAt), gt(obras.deletedAt, limite)));

  return rows
    .filter((r) => !r.projetoDeletedAt || r.projetoDeletedAt.getTime() !== r.obra.deletedAt!.getTime())
    .map((r) => ({ ...r.obra, projetoNome: r.projetoNome }));
}

// Pool de usuários com acesso à obra: administrador do workspace (acesso implícito a
// todas as obras) união com quem está explicitamente em obra_members. Mesmo critério
// usado por requireObraAccess — usado aqui pra restringir quem pode ser detentor de
// uma Cópia Controlada.
export async function listObraAccessUsers(workspaceId: string, obraId: string) {
  return db
    .selectDistinct({ userId: users.id, name: users.name, email: users.email })
    .from(users)
    .innerJoin(workspaceMembers, eq(workspaceMembers.userId, users.id))
    .leftJoin(obraMembers, and(eq(obraMembers.userId, users.id), eq(obraMembers.obraId, obraId)))
    .where(
      and(
        eq(workspaceMembers.workspaceId, workspaceId),
        or(eq(workspaceMembers.role, "administrador"), isNotNull(obraMembers.id))
      )
    );
}

export async function listObraMembers(obraId: string) {
  return db
    .select({ userId: users.id, name: users.name, email: users.email, createdAt: obraMembers.createdAt })
    .from(obraMembers)
    .innerJoin(users, eq(users.id, obraMembers.userId))
    .where(eq(obraMembers.obraId, obraId));
}

export async function addObraMember(obraId: string, email: string) {
  const [user] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (!user) throw notFound("USER_NOT_FOUND", "Nenhum usuário encontrado com este email.");
  return addObraMemberByUserId(obraId, user.id);
}

export async function addObraMemberByUserId(obraId: string, userId: string) {
  const [existing] = await db
    .select({ id: obraMembers.id })
    .from(obraMembers)
    .where(and(eq(obraMembers.obraId, obraId), eq(obraMembers.userId, userId)))
    .limit(1);
  if (existing) return existing;

  const [member] = await db.insert(obraMembers).values({ id: newId("obm"), obraId, userId }).returning();
  return member;
}

// Todos os pares (obraId, userId) de obra_members para obras deste workspace — usado pra
// montar a grade de acesso por Obra na tela de Membros e Permissões numa query só.
export async function listObraMembershipsDoWorkspace(workspaceId: string): Promise<{ obraId: string; userId: string }[]> {
  return db
    .select({ obraId: obraMembers.obraId, userId: obraMembers.userId })
    .from(obraMembers)
    .innerJoin(obras, eq(obras.id, obraMembers.obraId))
    .where(and(eq(obras.workspaceId, workspaceId), isNull(obras.deletedAt)));
}

// Obras do workspace inteiro (todas as Projetos), com o nome do Projeto — usado pra
// montar a grade de acesso por Obra, agrupada por Projeto.
export async function listObrasDoWorkspaceComProjeto(workspaceId: string) {
  return db
    .select({ id: obras.id, name: obras.name, code: obras.code, projetoId: obras.projetoId, projetoNome: projetos.name })
    .from(obras)
    .innerJoin(projetos, eq(projetos.id, obras.projetoId))
    .where(and(eq(obras.workspaceId, workspaceId), isNull(obras.deletedAt), isNull(projetos.deletedAt)))
    .orderBy(projetos.name, obras.name);
}

export async function removeObraMember(obraId: string, userId: string) {
  const deleted = await db
    .delete(obraMembers)
    .where(and(eq(obraMembers.obraId, obraId), eq(obraMembers.userId, userId)))
    .returning();
  if (deleted.length === 0) throw notFound("OBRA_MEMBER_NOT_FOUND", "Este usuário não tem acesso explícito a esta obra.");
}
