import { redirect } from "next/navigation";
import { UserCog } from "lucide-react";
import { auth } from "@/auth";
import { listWorkspaceMembers } from "@/services/workspaceService";
import { listObrasDoWorkspaceComProjeto, listObraMembershipsDoWorkspace } from "@/services/obraService";
import { getWorkspaceRole, WORKSPACE_ROLE_LABELS, WORKSPACE_ROLE_DESCRIPTIONS } from "@/services/permissions";
import { AddMemberForm } from "./add-member-form";
import { MemberRoleSelect } from "./member-role-select";
import { RemoveMemberButton } from "./remove-member-button";
import { MemberObraAccess } from "./member-obra-access";
import { EditMemberEmailDialog } from "./edit-member-email-dialog";

type Params = { params: Promise<{ workspaceId: string }> };

function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/);
  const primeira = partes[0]?.[0] ?? "";
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : "";
  return (primeira + ultima).toUpperCase();
}

export default async function MembrosPage({ params }: Params) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { workspaceId } = await params;
  const role = await getWorkspaceRole(session.user.id, workspaceId);
  if (!role) redirect("/workspaces");

  const [membros, obras, memberships] = await Promise.all([
    listWorkspaceMembers(workspaceId),
    listObrasDoWorkspaceComProjeto(workspaceId),
    listObraMembershipsDoWorkspace(workspaceId),
  ]);

  const isAdministrador = role === "administrador";
  const canManage = role === "administrador" || role === "coordenador";

  const obraIdsPorUsuario = new Map<string, Set<string>>();
  for (const m of memberships) {
    if (!obraIdsPorUsuario.has(m.userId)) obraIdsPorUsuario.set(m.userId, new Set());
    obraIdsPorUsuario.get(m.userId)!.add(m.obraId);
  }

  return (
    <div className="max-w-3xl p-8">
      <div className="mb-1 flex items-center gap-2">
        <UserCog className="size-5 shrink-0 text-muted-foreground" />
        <h1 className="text-2xl font-semibold">Membros e Permissões</h1>
      </div>
      <p className="mb-6 text-sm text-muted-foreground">
        Administrador acessa tudo. Os demais papéis só acessam as Obras liberadas explicitamente pra eles.
      </p>

      <ul className="mb-8 space-y-3">
        {membros.map((m) => (
          <li key={m.userId} className="rounded-lg border p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {iniciais(m.name ?? m.email)}
                </div>
                <div className="min-w-0 leading-tight">
                  <p className="truncate text-sm font-medium">{m.name ?? m.email}</p>
                  <p className="flex items-center truncate text-xs text-muted-foreground">
                    {m.email}
                    {canManage && <EditMemberEmailDialog workspaceId={workspaceId} userId={m.userId} emailAtual={m.email} />}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {isAdministrador ? (
                  <MemberRoleSelect workspaceId={workspaceId} userId={m.userId} role={m.role} />
                ) : (
                  <span className="rounded-md border px-2 py-1 text-xs text-muted-foreground">{WORKSPACE_ROLE_LABELS[m.role]}</span>
                )}
                {canManage && <RemoveMemberButton workspaceId={workspaceId} userId={m.userId} />}
              </div>
            </div>
            <p className="mt-1.5 pl-[42px] text-xs text-muted-foreground">{WORKSPACE_ROLE_DESCRIPTIONS[m.role]}</p>

            {m.role !== "administrador" && (
              <div className="mt-3 pl-[42px]">
                <MemberObraAccess
                  workspaceId={workspaceId}
                  targetUserId={m.userId}
                  obras={obras}
                  obraIdsComAcesso={obraIdsPorUsuario.get(m.userId) ?? new Set()}
                  canManage={canManage}
                />
              </div>
            )}
          </li>
        ))}
      </ul>

      {canManage && (
        <>
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">Adicionar membro</h2>
          <AddMemberForm workspaceId={workspaceId} />
        </>
      )}
    </div>
  );
}
