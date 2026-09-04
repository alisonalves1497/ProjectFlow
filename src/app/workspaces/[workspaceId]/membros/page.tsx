import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { listWorkspaceMembers } from "@/services/workspaceService";
import { listObrasDoWorkspaceComProjeto, listObraMembershipsDoWorkspace } from "@/services/obraService";
import { getWorkspaceRole } from "@/services/permissions";
import { MembrosScreen } from "./membros-screen";

type Params = { params: Promise<{ workspaceId: string }> };

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

  const obraIdsPorUsuario: Record<string, string[]> = {};
  for (const m of memberships) {
    (obraIdsPorUsuario[m.userId] ??= []).push(m.obraId);
  }

  return (
    <MembrosScreen
      workspaceId={workspaceId}
      membros={membros}
      obras={obras}
      obraIdsPorUsuario={obraIdsPorUsuario}
      currentUserId={session.user.id}
      isAdministrador={role === "administrador"}
      canManage={role === "administrador" || role === "coordenador"}
    />
  );
}
