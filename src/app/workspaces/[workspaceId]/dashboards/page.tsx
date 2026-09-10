import { redirect } from "next/navigation";
import { auth } from "@/auth";
import {
  listDocumentosParaDashboard,
  getCurvaAvanco,
  getOpcoesFiltroDashboard,
  type FiltrosDashboard,
} from "@/services/dashboardService";
import { listVisoesDashboard } from "@/services/dashboardVisaoService";
import type { StatusDocumento } from "@/lib/statusGraph";
import type { BlocoDashboard } from "@/lib/dashboardFiltros";
import { DashboardShell } from "./dashboard-shell";
import { DashboardContadores } from "./dashboard-contadores";
import { DashboardBarras } from "./dashboard-barras";
import { DashboardResponsavel } from "./dashboard-responsavel";
import { DashboardResumoObra } from "./dashboard-resumo-obra";
import { DashboardCurvaAvanco } from "./dashboard-curva-avanco";

type Params = {
  params: Promise<{ workspaceId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function lista(v: string | string[] | undefined): string[] | undefined {
  if (!v) return undefined;
  const arr = (Array.isArray(v) ? v.join(",") : v).split(",").filter(Boolean);
  return arr.length ? arr : undefined;
}

export default async function DashboardsPage({ params, searchParams }: Params) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { workspaceId } = await params;
  const sp = await searchParams;

  const filtros: FiltrosDashboard = {
    obraIds: lista(sp.obra),
    disciplinas: lista(sp.disc),
    responsavelIds: lista(sp.resp),
    status: lista(sp.status) as StatusDocumento[] | undefined,
    dataDe: typeof sp.de === "string" ? sp.de : null,
    dataAte: typeof sp.ate === "string" ? sp.ate : null,
  };

  const [opcoes, documentos, curvaAvanco, visoes] = await Promise.all([
    getOpcoesFiltroDashboard(workspaceId, session.user.id),
    listDocumentosParaDashboard(workspaceId, session.user.id, filtros),
    getCurvaAvanco(workspaceId, session.user.id, {
      obraIds: filtros.obraIds,
      disciplinas: filtros.disciplinas,
      responsavelIds: filtros.responsavelIds,
    }),
    listVisoesDashboard(workspaceId, session.user.id),
  ]);

  const blocos: Record<BlocoDashboard, React.ReactNode> = {
    contadores: <DashboardContadores documentos={documentos} />,
    barras: <DashboardBarras documentos={documentos} />,
    curva: <DashboardCurvaAvanco pontos={curvaAvanco} />,
    resumo: <DashboardResumoObra documentos={documentos} />,
    responsavel: <DashboardResponsavel documentos={documentos} workspaceId={workspaceId} />,
  };

  return (
    <div className="p-8">
      <h1 className="mb-1 text-2xl font-semibold">Dashboards</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Filtros valem pra todos os blocos (a curva de avanço ignora status e período). Em “Blocos” dá pra
        ligar/desligar e reordenar; em “Visões”, salvar um conjunto de blocos + filtros pra reabrir depois.
      </p>

      <DashboardShell workspaceId={workspaceId} opcoes={opcoes} visoes={visoes} blocos={blocos} />
    </div>
  );
}
