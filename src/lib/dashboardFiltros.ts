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
