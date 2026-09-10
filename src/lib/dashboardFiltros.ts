import type { StatusDocumento } from "@/lib/statusGraph";

// Tipos e constantes dos filtros do dashboard — arquivo separado (sem import de banco) pra
// poder ser usado tanto no service quanto nos client components sem arrastar o `pg` pro
// bundle do navegador.

// Sentinela usado no filtro de responsável pra representar "não atribuído".
export const SEM_RESPONSAVEL = "__sem__";

export type FiltrosDashboard = {
  obraIds?: string[];
  disciplinas?: string[]; // por nome (é o que a UI mostra)
  responsavelIds?: string[];
  status?: StatusDocumento[];
  dataDe?: string | null; // yyyy-mm-dd — filtra a data efetiva (reprogramada ?? prevista)
  dataAte?: string | null;
};

export type OpcoesFiltroDashboard = {
  obras: { id: string; nome: string }[];
  disciplinas: string[];
  responsaveis: { id: string; nome: string }[];
};

// ---- Layout dos blocos (painel montável) --------------------------------------

export const BLOCOS_DASHBOARD = ["contadores", "barras", "curva", "resumo", "responsavel"] as const;
export type BlocoDashboard = (typeof BLOCOS_DASHBOARD)[number];

export const BLOCO_LABEL: Record<BlocoDashboard, string> = {
  contadores: "Contadores",
  barras: "Barras (disciplina / status)",
  curva: "Curva de avanço",
  resumo: "Resumo por obra",
  responsavel: "Por responsável",
};

// Ordem do array = ordem de render. `visivel` liga/desliga o bloco.
export type LayoutDashboard = { id: BlocoDashboard; visivel: boolean }[];

export const LAYOUT_PADRAO: LayoutDashboard = BLOCOS_DASHBOARD.map((id) => ({ id, visivel: true }));

// Normaliza um layout vindo do banco/localStorage: mantém a ordem salva, descarta ids
// desconhecidos e acrescenta (desligados) blocos novos que ainda não estavam na config.
export function normalizarLayout(bruto: unknown): LayoutDashboard {
  const arr = Array.isArray(bruto) ? bruto : [];
  const vistos = new Set<string>();
  const saida: LayoutDashboard = [];
  for (const item of arr) {
    const id = (item as { id?: string })?.id;
    if (typeof id === "string" && (BLOCOS_DASHBOARD as readonly string[]).includes(id) && !vistos.has(id)) {
      vistos.add(id);
      saida.push({ id: id as BlocoDashboard, visivel: (item as { visivel?: boolean }).visivel !== false });
    }
  }
  for (const id of BLOCOS_DASHBOARD) if (!vistos.has(id)) saida.push({ id, visivel: false });
  return saida;
}

// Config completa de uma "visão" salva: layout dos blocos + retrato dos filtros (querystring).
export type DashboardVisaoConfig = {
  layout: LayoutDashboard;
  filtros: Record<string, string>;
};

export type DashboardVisao = {
  id: string;
  nome: string;
  config: DashboardVisaoConfig;
};
