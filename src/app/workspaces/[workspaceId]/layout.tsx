import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getWorkspaceRole } from "@/services/permissions";
import { AppSidebar } from "@/components/app-sidebar";
import { isAssistenteIaAtivo } from "@/lib/anthropic";
import { getArvoreProjetos } from "@/services/navegacaoService";

type Params = { params: Promise<{ workspaceId: string }>; children: React.ReactNode; modal: React.ReactNode };

export default async function WorkspaceShellLayout({ params, children, modal }: Params) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { workspaceId } = await params;
  const role = await getWorkspaceRole(session.user.id, workspaceId);
  if (!role) redirect("/workspaces");

  const arvore = await getArvoreProjetos(workspaceId, session.user.id);

  return (
    <div className="flex min-h-screen">
      <AppSidebar
        workspaceId={workspaceId}
        role={role}
        assistenteIaAtivo={isAssistenteIaAtivo()}
        arvore={arvore}
        userName={session.user.name ?? ""}
        userEmail={session.user.email ?? ""}
      />
      <main className="flex-1 overflow-y-auto">{children}</main>
      {modal}
    </div>
  );
}
