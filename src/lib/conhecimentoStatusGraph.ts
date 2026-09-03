export type TipoItemConhecimento = "rfi" | "rnc";

export type StatusItemConhecimento =
  | "aberta"
  | "em_analise"
  | "respondida"
  | "em_correcao"
  | "corrigida"
  | "verificada"
  | "fechada";

// RFI: pergunta que espera resposta — 4 estados.
const RFI_TRANSITIONS: Partial<Record<StatusItemConhecimento, StatusItemConhecimento[]>> = {
  aberta: ["em_analise"],
  em_analise: ["respondida"],
  respondida: ["fechada"],
};

// RNC: não conformidade que espera correção — correção e verificação são passos
// separados (quem corrige não é necessariamente quem verifica), 6 estados.
const RNC_TRANSITIONS: Partial<Record<StatusItemConhecimento, StatusItemConhecimento[]>> = {
  aberta: ["em_analise"],
  em_analise: ["em_correcao"],
  em_correcao: ["corrigida"],
  corrigida: ["verificada"],
  verificada: ["fechada"],
};

function graphFor(tipo: TipoItemConhecimento) {
  return tipo === "rfi" ? RFI_TRANSITIONS : RNC_TRANSITIONS;
}

export function isValidTransition(tipo: TipoItemConhecimento, from: StatusItemConhecimento, to: StatusItemConhecimento): boolean {
  return graphFor(tipo)[from]?.includes(to) ?? false;
}

export function validNextStatuses(tipo: TipoItemConhecimento, from: StatusItemConhecimento): StatusItemConhecimento[] {
  return graphFor(tipo)[from] ?? [];
}

export function isFechada(status: StatusItemConhecimento): boolean {
  return status === "fechada";
}

export const STATUS_INICIAL: StatusItemConhecimento = "aberta";

export const STATUS_LABELS: Record<StatusItemConhecimento, string> = {
  aberta: "Aberta",
  em_analise: "Em análise",
  respondida: "Respondida",
  em_correcao: "Em correção",
  corrigida: "Corrigida",
  verificada: "Verificada",
  fechada: "Fechada",
};

export const TIPO_LABELS: Record<TipoItemConhecimento, string> = {
  rfi: "RFI",
  rnc: "RNC",
};
