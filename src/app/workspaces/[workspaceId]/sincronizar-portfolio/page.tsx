import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getWorkspaceRole } from "@/services/permissions";
import { SincronizarPortfolioWizard } from "./sync-wizard";

type Params = {
  params: Promise<{ workspaceId: string }>;
};

export default async function SincronizarPortfolioPage({ params }: Params) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { workspaceId } = await params;
  const role = await getWorkspaceRole(session.user.id, workspaceId);
  if (!role) redirect("/workspaces");
  if (role !== "administrador" && role !== "coordenador") redirect(`/workspaces/${workspaceId}`);

  return (
    <div className="mx-auto max-w-5xl p-8">
      <h1 className="mb-1 text-2xl font-semibold">Sincronizar Portfólio</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Sobe uma planilha com várias obras de uma vez (Contrato = Projeto, Sistema = Obra) e atualiza tudo que já existe.
        Projeto e Obra que ainda não existem são criados automaticamente — e documento novo só entra depois de você
        confirmar, obra por obra.
      </p>
      <SincronizarPortfolioWizard workspaceId={workspaceId} />
    </div>
  );
}
