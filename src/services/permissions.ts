import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { workspaceMembers, obraMembers, obras } from "@/db/schema";
import { forbidden, notFound } from "@/lib/errors";
import { type WorkspaceRole } from "@/lib/roles";

export type { WorkspaceRole };
export { ALL_WORKSPACE_ROLES, WORKSPACE_ROLE_LABELS, WORKSPACE_ROLE_DESCRIPTIONS } from "@/lib/roles";

// Únicos papéis com acesso implícito a toda Obra do workspace — os demais (coordenador,
// lider_aprovador, analista) só acessam Obras onde estão em obra_members.
const ACESSO_TOTAL_OBRAS: WorkspaceRole[] = ["administrador"];

export async function getWorkspaceRole(userId: string, workspaceId: string): Promise<WorkspaceRole | null> {
  const [row] = await db
    .select({ role: workspaceMembers.role })
    .from(workspaceMembers)
    .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, userId)))
    .limit(1);
  return row?.role ?? null;
}

export async function requireWorkspaceRole(
  userId: string,
  workspaceId: string,
  allowed: WorkspaceRole[]
): Promise<WorkspaceRole> {
  const role = await getWorkspaceRole(userId, workspaceId);
  if (!role) throw forbidden("WORKSPACE_ACCESS_DENIED", "Você não é membro deste workspace.");
  if (!allowed.includes(role)) throw forbidden("WORKSPACE_ROLE_INSUFFICIENT", "Seu papel no workspace não permite esta ação.");
  return role;
}

// administrador sempre tem acesso a todas as obras do workspace.
// coordenador/lider_aprovador/analista só acessam obras onde estão explicitamente
// listados em obra_members.
export async function requireObraAccess(userId: string, workspaceId: string, obraId: string): Promise<void> {
  const role = await getWorkspaceRole(userId, workspaceId);
  if (!role) throw forbidden("WORKSPACE_ACCESS_DENIED", "Você não é membro deste workspace.");

  const [obra] = await db.select({ id: obras.id }).from(obras).where(eq(obras.id, obraId)).limit(1);
  if (!obra) throw notFound("OBRA_NOT_FOUND", "Obra não encontrada.");

  if (ACESSO_TOTAL_OBRAS.includes(role)) return;

  const [membership] = await db
    .select({ id: obraMembers.id })
    .from(obraMembers)
    .where(and(eq(obraMembers.obraId, obraId), eq(obraMembers.userId, userId)))
    .limit(1);
  if (!membership) throw forbidden("OBRA_ACCESS_DENIED", "Você não tem acesso a esta obra.");
}

// Resolve o conjunto completo de obras que o usuário acessa NESTE workspace —
// administrador: todas; demais papéis: só as de obra_members. Usado por agregações
// cross-obra (ex: Painel) que não podem repetir a checagem obra a obra.
export async function listAccessibleObraIdsInWorkspace(userId: string, workspaceId: string): Promise<string[]> {
  const role = await getWorkspaceRole(userId, workspaceId);
  if (!role) return [];

  if (ACESSO_TOTAL_OBRAS.includes(role)) {
    const rows = await db
      .select({ id: obras.id })
      .from(obras)
      .where(and(eq(obras.workspaceId, workspaceId), isNull(obras.deletedAt)));
    return rows.map((r) => r.id);
  }

  const rows = await db
    .select({ obraId: obraMembers.obraId })
    .from(obraMembers)
    .innerJoin(obras, eq(obras.id, obraMembers.obraId))
    .where(and(eq(obraMembers.userId, userId), eq(obras.workspaceId, workspaceId), isNull(obras.deletedAt)));
  return rows.map((r) => r.obraId);
}
