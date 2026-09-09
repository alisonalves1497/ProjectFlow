import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { listDocumentosParaDashboard } from "@/services/dashboardService";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DashboardResponsavel } from "./dashboard-responsavel";
import { DashboardResumoObra } from "./dashboard-resumo-obra";

type Params = { params: Promise<{ workspaceId: string }> };

export default async function DashboardsPage({ params }: Params) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { workspaceId } = await params;
  const documentos = await listDocumentosParaDashboard(workspaceId, session.user.id);

  return (
    <div className="p-8">
      <h1 className="mb-1 text-2xl font-semibold">Dashboards</h1>
      <p className="mb-6 text-sm text-muted-foreground">Acompanhamento do portfólio — por responsável, obra e disciplina.</p>

      <Tabs defaultValue="responsavel">
        <TabsList variant="line" className="mb-6 w-full justify-start border-b">
          <TabsTrigger value="responsavel">Por responsável</TabsTrigger>
          <TabsTrigger value="obra">Resumo por obra</TabsTrigger>
        </TabsList>

        <TabsContent value="responsavel">
          <DashboardResponsavel documentos={documentos} workspaceId={workspaceId} />
        </TabsContent>

        <TabsContent value="obra">
          <DashboardResumoObra documentos={documentos} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
