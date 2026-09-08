import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { listDocumentosParaDashboard } from "@/services/dashboardService";
import { DashboardResponsavel } from "./dashboard-responsavel";

type Params = { params: Promise<{ workspaceId: string }> };

export default async function DashboardsPage({ params }: Params) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { workspaceId } = await params;
  const documentos = await listDocumentosParaDashboard(workspaceId, session.user.id);

  return (
    <div className="p-8">
      <h1 className="mb-1 text-2xl font-semibold">Dashboards</h1>
      <p className="mb-6 text-sm text-muted-foreground">Acompanhamento por responsável — tarefas, cronograma e percentual concluído.</p>

      <DashboardResponsavel documentos={documentos} workspaceId={workspaceId} />
    </div>
  );
}
