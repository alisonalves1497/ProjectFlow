export type StatusDocumento =
  | "previsto"
  | "em_rascunho"
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
  em_rascunho: ["em_elaboracao"],
  em_elaboracao: ["em_revisao_interna", "informativo"],
  em_revisao_interna: ["devolvido_correcao", "aprovacao_lider_tecnico"],
};

const FORMAL_TRANSITIONS: Partial<Record<StatusDocumento, StatusDocumento[]>> = {
  aguardando_envio_ged: ["em_analise_cliente"],
  em_analise_cliente: ["aprovado", "aprovado_com_comentarios", "reprovado", "devolvido_pelo_cliente"],
};

const AS_BUILT_TRANSITIONS: Partial<Record<StatusDocumento, StatusDocumento[]>> = {
  em_rascunho: ["em_elaboracao"],
  em_elaboracao: ["em_revisao_interna"],
  em_revisao_interna: ["aprovado"],
};

const CANCELABLE_FROM: Record<RevisaoTipo, StatusDocumento[]> = {
  interno: ["em_rascunho", "em_elaboracao", "em_revisao_interna"],
  formal: ["aguardando_envio_ged", "em_analise_cliente"],
  as_built: ["em_rascunho", "em_elaboracao", "em_revisao_interna"],
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
    return { tipo: "interno", letra: "A", numero: 1, startStatus: "em_rascunho" };
  }

  const tipo = tipoDaRevisao(current);
  if (!isTerminal(tipo, current.status)) return null;

  if (tipo === "interno") {
    if (current.status === "devolvido_correcao") {
      return { tipo: "interno", letra: current.letra!, numero: current.numero! + 1, startStatus: "em_rascunho" };
    }
    if (current.status === "aprovacao_lider_tecnico") {
      return { tipo: "formal", letra: current.letra!, numero: 0, startStatus: "aguardando_envio_ged" };
    }
    return null; // informativo, cancelado — documento fechado, sem próxima revisão
  }

  if (tipo === "formal") {
    if (current.status === "reprovado" || current.status === "devolvido_pelo_cliente") {
      return { tipo: "interno", letra: proximaLetra(current.letra!), numero: 1, startStatus: "em_rascunho" };
    }
    if (current.status === "aprovado" || current.status === "aprovado_com_comentarios") {
      return { tipo: "as_built", startStatus: "em_rascunho" };
    }
    return null; // cancelado
  }

  return null; // as_built aprovado/cancelado — sem próxima revisão
}

const ALL_STATUSES: StatusDocumento[] = [
  "previsto",
  "em_rascunho",
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
  em_rascunho: "Em rascunho",
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

// Cor de cada status — fonte única pro badge e pra bolinha da legenda.
// Prioridade de cores DISTINTAS foi dada aos status realmente em uso hoje em produção
// (liberado p/ construção, em rascunho, em revisão interna, em análise do cliente, cancelado,
// previsto). Os demais herdam uma cor coerente com a fase, mesmo que compartilhem tom entre si.
//   `badge` = classes do rótulo (claro + escuro); `ponto` = bolinha sólida da legenda.
export const STATUS_COR: Record<StatusDocumento, { badge: string; ponto: string }> = {
  // planejado, ainda não começou
  previsto: { badge: "bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300", ponto: "bg-slate-400" },
  // rascunho é meio "tanto faz" — violeta, deixa o âmbar livre pro "em análise do cliente"
  em_rascunho: { badge: "bg-violet-100 text-violet-800 dark:bg-violet-500/15 dark:text-violet-400", ponto: "bg-violet-500" },
  em_elaboracao: { badge: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-400", ponto: "bg-amber-400" },
  // precisa de retrabalho interno — laranja (atenção, mas não é falha)
  devolvido_correcao: { badge: "bg-orange-100 text-orange-800 dark:bg-orange-500/15 dark:text-orange-400", ponto: "bg-orange-400" },
  // na nossa mão, revisando (em uso) — azul
  em_revisao_interna: { badge: "bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-400", ponto: "bg-blue-500" },
  // porta de aprovação interna — ciano
  aprovacao_lider_tecnico: { badge: "bg-cyan-100 text-cyan-800 dark:bg-cyan-500/15 dark:text-cyan-400", ponto: "bg-cyan-500" },
  // na fila pra sair pro GED — índigo
  aguardando_envio_ged: { badge: "bg-indigo-100 text-indigo-800 dark:bg-indigo-500/15 dark:text-indigo-400", ponto: "bg-indigo-500" },
  // na mão do cliente (em uso) — amarelo/âmbar, cor padrão pra "aguardando"
  em_analise_cliente: { badge: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-400", ponto: "bg-amber-400" },
  // aprovado, ainda não liberado — verde-azulado
  aprovado: { badge: "bg-teal-100 text-teal-800 dark:bg-teal-500/15 dark:text-teal-400", ponto: "bg-teal-500" },
  aprovado_com_comentarios: { badge: "bg-teal-100 text-teal-800 dark:bg-teal-500/15 dark:text-teal-400", ponto: "bg-teal-500" },
  // reprovado — vermelho (ação necessária)
  reprovado: { badge: "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-400", ponto: "bg-red-500" },
  // released (em uso, maioria) — verde
  liberado_para_construcao: { badge: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-400", ponto: "bg-emerald-500" },
  // cliente devolveu — rosa (atenção externa)
  devolvido_pelo_cliente: { badge: "bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-400", ponto: "bg-rose-500" },
  // sem fluxo, só informativo — cinza
  informativo: { badge: "bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300", ponto: "bg-slate-400" },
  // encerrado (em uso) — cinza neutro "morto" (diferente do vermelho de reprovado)
  cancelado: { badge: "bg-zinc-200 text-zinc-600 dark:bg-zinc-500/20 dark:text-zinc-300", ponto: "bg-zinc-400" },
};
