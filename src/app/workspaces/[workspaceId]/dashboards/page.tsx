import { redirect } from "next/navigation";
import { auth } from "@/auth";
import {
  listDocumentosParaDashboard,
  getCurvaAvanco,
  getOpcoesFiltroDashboard,
  type FiltrosDashboard,
} from "@/services/dashboardService";
import type { StatusDocumento } from "@/lib/statusGraph";
import { DashboardFiltros } from "./dashboard-filtros";
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

  const [opcoes, documentos, curvaAvanco] = await Promise.all([
    getOpcoesFiltroDashboard(workspaceId, session.user.id),
    listDocumentosParaDashboard(workspaceId, session.user.id, filtros),
    getCurvaAvanco(workspaceId, session.user.id, {
      obraIds: filtros.obraIds,
      disciplinas: filtros.disciplinas,
      responsavelIds: filtros.responsavelIds,
    }),
  ]);

  return (
    <div className="p-8">
      <h1 className="mb-1 text-2xl font-semibold">Dashboards</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Acompanhamento do portfólio. Os filtros abaixo valem pra todos os blocos (a curva de avanço ignora status e período).
      </p>

      <DashboardFiltros opcoes={opcoes} />
      <DashboardContadores documentos={documentos} />
      <DashboardBarras documentos={documentos} />

      <div className="mb-6">
        <DashboardCurvaAvanco pontos={curvaAvanco} />
      </div>

      <div className="mb-6">
        <DashboardResumoObra documentos={documentos} />
      </div>

      <DashboardResponsavel documentos={documentos} workspaceId={workspaceId} />
    </div>
  );
}
