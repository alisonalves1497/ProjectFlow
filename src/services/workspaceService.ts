import bcrypt from "bcryptjs";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { workspaces, workspaceMembers, users } from "@/db/schema";
import { newId } from "@/lib/id";
import { badRequest, conflict, notFound, ApiError } from "@/lib/errors";
import type { WorkspaceRole } from "./permissions";

// Sistema é single-tenant por decisão de produto: só existe UM workspace no ar. O
// primeiro usuário a logar cria esse único workspace; depois disso, ninguém mais
// consegue criar outro (nem contornando a UI — a checagem é aqui, não só escondendo
// o botão).
export async function existeAlgumWorkspace(): Promise<boolean> {
  const [row] = await db.select({ id: workspaces.id }).from(workspaces).limit(1);
  return !!row;
}

export async function createWorkspace(ownerId: string, input: { name: string; slug: string }) {
  if (await existeAlgumWorkspace()) {
    throw conflict("WORKSPACE_JA_EXISTE", "Este sistema já tem um workspace — peça pra um administrador te adicionar como membro.");
  }

  const [existing] = await db.select({ id: workspaces.id }).from(workspaces).where(eq(workspaces.slug, input.slug)).limit(1);
  if (existing) throw conflict("WORKSPACE_SLUG_TAKEN", "Já existe um workspace com este slug.");

  return db.transaction(async (tx) => {
    const [workspace] = await tx
      .insert(workspaces)
      .values({ id: newId("ws"), name: input.name, slug: input.slug })
      .returning();

    await tx.insert(workspaceMembers).values({
      id: newId("wsm"),
      workspaceId: workspace.id,
      userId: ownerId,
      role: "administrador",
    });

    return workspace;
  });
}

export async function listWorkspacesForUser(userId: string) {
  return db
    .select({
      id: workspaces.id,
      name: workspaces.name,
      slug: workspaces.slug,
      role: workspaceMembers.role,
      createdAt: workspaces.createdAt,
    })
    .from(workspaceMembers)
    .innerJoin(workspaces, eq(workspaces.id, workspaceMembers.workspaceId))
    .where(eq(workspaceMembers.userId, userId));
}

export async function getWorkspaceOrThrow(workspaceId: string) {
  const [workspace] = await db.select().from(workspaces).where(eq(workspaces.id, workspaceId)).limit(1);
  if (!workspace) throw notFound("WORKSPACE_NOT_FOUND", "Workspace não encontrado.");
  return workspace;
}

export async function updateWorkspace(workspaceId: string, patch: { name?: string; slug?: string }) {
  if (patch.slug) {
    const [existing] = await db
      .select({ id: workspaces.id })
      .from(workspaces)
      .where(eq(workspaces.slug, patch.slug))
      .limit(1);
    if (existing && existing.id !== workspaceId) throw conflict("WORKSPACE_SLUG_TAKEN", "Já existe um workspace com este slug.");
  }
  const [updated] = await db
    .update(workspaces)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(workspaces.id, workspaceId))
    .returning();
  if (!updated) throw notFound("WORKSPACE_NOT_FOUND", "Workspace não encontrado.");
  return updated;
}

export async function listWorkspaceMembers(workspaceId: string) {
  return db
    .select({
      userId: users.id,
      name: users.name,
      email: users.email,
      role: workspaceMembers.role,
      createdAt: workspaceMembers.createdAt,
    })
    .from(workspaceMembers)
    .innerJoin(users, eq(users.id, workspaceMembers.userId))
    .where(eq(workspaceMembers.workspaceId, workspaceId));
}

// Se o email já tem conta, só adiciona como membro. Se não tem, cria a conta na hora
// (o administrador/coordenador que está convidando escolhe nome e uma senha provisória
// — não há fluxo de convite por link/email ainda, então a senha precisa ser repassada
// pra pessoa por fora do sistema).
export async function addWorkspaceMember(
  workspaceId: string,
  input: { email: string; role: WorkspaceRole; nome?: string; senha?: string }
) {
  let [user] = await db.select({ id: users.id }).from(users).where(eq(users.email, input.email)).limit(1);

  if (!user) {
    if (!input.nome || !input.senha) {
      throw badRequest(
        "USUARIO_NOVO_PRECISA_NOME_SENHA",
        "Esse email ainda não tem conta — informe nome e uma senha provisória pra criar."
      );
    }
    const passwordHash = await bcrypt.hash(input.senha, 10);
    [user] = await db
      .insert(users)
      .values({ id: newId("usr"), name: input.nome, email: input.email, passwordHash })
      .returning();
  }

  const [existing] = await db
    .select({ id: workspaceMembers.id })
    .from(workspaceMembers)
    .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, user.id)))
    .limit(1);
  if (existing) throw conflict("WORKSPACE_MEMBER_ALREADY_EXISTS", "Este usuário já é membro do workspace.");

  const [member] = await db
    .insert(workspaceMembers)
    .values({ id: newId("wsm"), workspaceId, userId: user.id, role: input.role })
    .returning();
  return member;
}

export async function updateWorkspaceMemberRole(workspaceId: string, userId: string, role: WorkspaceRole) {
  await assertNotLastOwnerDemotion(workspaceId, userId, role);
  const [updated] = await db
    .update(workspaceMembers)
    .set({ role })
    .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, userId)))
    .returning();
  if (!updated) throw notFound("WORKSPACE_MEMBER_NOT_FOUND", "Membro não encontrado neste workspace.");
  return updated;
}

export async function removeWorkspaceMember(workspaceId: string, userId: string) {
  await assertNotLastOwnerDemotion(workspaceId, userId, null);
  const deleted = await db
    .delete(workspaceMembers)
    .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, userId)))
    .returning();
  if (deleted.length === 0) throw notFound("WORKSPACE_MEMBER_NOT_FOUND", "Membro não encontrado neste workspace.");
}

async function assertNotLastOwnerDemotion(workspaceId: string, userId: string, newRole: WorkspaceRole | null) {
  if (newRole === "administrador") return;
  const [current] = await db
    .select({ role: workspaceMembers.role })
    .from(workspaceMembers)
    .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, userId)))
    .limit(1);
  if (current?.role !== "administrador") return;

  const owners = await db
    .select({ id: workspaceMembers.id })
    .from(workspaceMembers)
    .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.role, "administrador")));
  if (owners.length <= 1) {
    throw new ApiError(409, "WORKSPACE_LAST_OWNER", "Não é possível remover ou rebaixar o único administrador do workspace.");
  }
}
