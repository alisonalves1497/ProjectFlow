export type StatusDocumento =
  | "previsto"
  | "em_elaboracao"
  | "devolvido_correcao"
  | "em_revisao_interna"
  | "aprovacao_lider_tecnico"
  | "aguardando_envio_ged"
  | "em_analise_cliente"
  | "aprovado"
  | "aprovado_com_comentarios"
  | "reprovado"
  | "liberado_para_construcao"
  | "devolvido_pelo_cliente"
  | "informativo"
  | "cancelado";

// Derivado da revisão, não armazenado: interno (letra/número >= 1), formal (letra/número = 0,
// a que foi enviada ao cliente), as_built (esquema próprio AB-00/AB-01, fora de letra/número).
export type RevisaoTipo = "interno" | "formal" | "as_built";

export function tipoDaRevisao(revisao: { ehAsBuilt: boolean; numero: number | null }): RevisaoTipo {
  if (revisao.ehAsBuilt) return "as_built";
  return revisao.numero === 0 ? "formal" : "interno";
}

// Bucket A: transições que mutam a própria revisão (não geram letra/número novo).
const INTERNO_TRANSITIONS: Partial<Record<StatusDocumento, StatusDocumento[]>> = {
  em_elaboracao: ["em_revisao_interna", "informativo"],
  em_revisao_interna: ["devolvido_correcao", "aprovacao_lider_tecnico"],
};

const FORMAL_TRANSITIONS: Partial<Record<StatusDocumento, StatusDocumento[]>> = {
  aguardando_envio_ged: ["em_analise_cliente"],
  em_analise_cliente: ["aprovado", "aprovado_com_comentarios", "reprovado", "devolvido_pelo_cliente"],
};

const AS_BUILT_TRANSITIONS: Partial<Record<StatusDocumento, StatusDocumento[]>> = {
  em_elaboracao: ["em_revisao_interna"],
  em_revisao_interna: ["aprovado"],
};

const CANCELABLE_FROM: Record<RevisaoTipo, StatusDocumento[]> = {
  interno: ["em_elaboracao", "em_revisao_interna"],
  formal: ["aguardando_envio_ged", "em_analise_cliente"],
  as_built: ["em_elaboracao", "em_revisao_interna"],
};

// Status que travam a revisão (Bucket A já não tem mais pra onde ir) e liberam
// a criação de uma revisão nova — ver nextRevisionSpec.
const TERMINAL_STATUSES: Record<RevisaoTipo, StatusDocumento[]> = {
  interno: ["devolvido_correcao", "aprovacao_lider_tecnico", "informativo", "cancelado"],
  formal: ["aprovado", "aprovado_com_comentarios", "reprovado", "devolvido_pelo_cliente", "cancelado"],
  as_built: ["aprovado", "cancelado"],
};

function graphFor(tipo: RevisaoTipo) {
  if (tipo === "interno") return INTERNO_TRANSITIONS;
  if (tipo === "formal") return FORMAL_TRANSITIONS;
  return AS_BUILT_TRANSITIONS;
}

export function isValidInPlaceTransition(tipo: RevisaoTipo, from: StatusDocumento, to: StatusDocumento): boolean {
  if (to === "cancelado") return CANCELABLE_FROM[tipo].includes(from);
  return graphFor(tipo)[from]?.includes(to) ?? false;
}

export function isTerminal(tipo: RevisaoTipo, status: StatusDocumento): boolean {
  return TERMINAL_STATUSES[tipo].includes(status);
}

function proximaLetra(letra: string): string {
  return String.fromCharCode(letra.charCodeAt(0) + 1);
}

export type ProximaRevisaoSpec =
  | { tipo: "interno"; letra: string; numero: number; startStatus: StatusDocumento }
  | { tipo: "formal"; letra: string; numero: 0; startStatus: StatusDocumento }
  | { tipo: "as_built"; startStatus: StatusDocumento };

// Bucket B: dado o estado da revisão atual (ou null se o documento ainda não tem nenhuma),
// decide determinística e exaustivamente qual é a ÚNICA próxima revisão válida — ou null se
// a atual ainda não chegou a um status terminal (precisa transicionar primeiro).
export function nextRevisionSpec(
  current: { ehAsBuilt: boolean; letra: string | null; numero: number | null; status: StatusDocumento } | null
): ProximaRevisaoSpec | null {
  if (!current) {
    return { tipo: "interno", letra: "A", numero: 1, startStatus: "em_elaboracao" };
  }

  const tipo = tipoDaRevisao(current);
  if (!isTerminal(tipo, current.status)) return null;

  if (tipo === "interno") {
    if (current.status === "devolvido_correcao") {
      return { tipo: "interno", letra: current.letra!, numero: current.numero! + 1, startStatus: "em_elaboracao" };
    }
    if (current.status === "aprovacao_lider_tecnico") {
      return { tipo: "formal", letra: current.letra!, numero: 0, startStatus: "aguardando_envio_ged" };
    }
    return null; // informativo, cancelado — documento fechado, sem próxima revisão
  }

  if (tipo === "formal") {
    if (current.status === "reprovado" || current.status === "devolvido_pelo_cliente") {
      return { tipo: "interno", letra: proximaLetra(current.letra!), numero: 1, startStatus: "em_elaboracao" };
    }
    if (current.status === "aprovado" || current.status === "aprovado_com_comentarios") {
      return { tipo: "as_built", startStatus: "em_elaboracao" };
    }
    return null; // cancelado
  }

  return null; // as_built aprovado/cancelado — sem próxima revisão
}

const ALL_STATUSES: StatusDocumento[] = [
  "previsto",
  "em_elaboracao",
  "devolvido_correcao",
  "em_revisao_interna",
  "aprovacao_lider_tecnico",
  "aguardando_envio_ged",
  "em_analise_cliente",
  "aprovado",
  "aprovado_com_comentarios",
  "reprovado",
  "liberado_para_construcao",
  "devolvido_pelo_cliente",
  "informativo",
  "cancelado",
];

// Usado pela UI pra só oferecer botões de transições de fato válidas (Bucket A).
export function validNextStatuses(tipo: RevisaoTipo, from: StatusDocumento): StatusDocumento[] {
  return ALL_STATUSES.filter((to) => isValidInPlaceTransition(tipo, from, to));
}

export const STATUS_LABELS: Record<StatusDocumento, string> = {
  previsto: "Previsto",
  em_elaboracao: "Em elaboração",
  devolvido_correcao: "Devolvido para correção",
  em_revisao_interna: "Em revisão interna",
  aprovacao_lider_tecnico: "Aprovação do líder técnico",
  aguardando_envio_ged: "Aguardando envio ao GED",
  em_analise_cliente: "Em análise do cliente",
  aprovado: "Aprovado",
  aprovado_com_comentarios: "Aprovado com comentários",
  reprovado: "Reprovado",
  liberado_para_construcao: "Liberado para construção",
  devolvido_pelo_cliente: "Devolvido pelo cliente",
  informativo: "Informativo",
  cancelado: "Cancelado",
};
