import { nextRevisionSpec, isTerminal, tipoDaRevisao, type StatusDocumento } from "@/lib/statusGraph";

export type DocumentoComRevisaoAtual = {
  currentRevisionId: string | null;
  status: StatusDocumento;
  revisaoEhAsBuilt: boolean | null;
  revisaoLetra: string | null;
  revisaoNumero: number | null;
};

// "Fechado" só quando a revisão atual chegou a um status TERMINAL e, além disso,
// não há próxima revisão possível (nextRevisionSpec null). Um documento em status
// não-terminal (ex: em_elaboracao) também dá null em nextRevisionSpec, mas está
// bem no meio do fluxo — nextRevisionSpec sozinho não distingue os dois casos.
export function isDocumentoFechado(doc: DocumentoComRevisaoAtual): boolean {
  // "Liberado para construção" é um marco pós-aprovação no documento (ver revisaoService.ts) —
  // sempre fechado, independente do status genérico da revisão por trás.
  if (doc.status === "liberado_para_construcao") return true;
  if (!doc.currentRevisionId) return false;
  const tipo = tipoDaRevisao({ ehAsBuilt: doc.revisaoEhAsBuilt ?? false, numero: doc.revisaoNumero });
  if (!isTerminal(tipo, doc.status)) return false;
  const spec = nextRevisionSpec({
    ehAsBuilt: doc.revisaoEhAsBuilt ?? false,
    letra: doc.revisaoLetra,
    numero: doc.revisaoNumero,
    status: doc.status,
  });
  return spec === null;
}

// "Com retrabalho": a revisão atual já passou de A (ou seja, já foi reprovada/devolvida
// pelo menos uma vez, iniciando uma letra nova). As Built (letra null) não conta.
export function isDocumentoComRetrabalho(doc: { revisaoLetra: string | null }): boolean {
  return doc.revisaoLetra !== null && doc.revisaoLetra !== "A";
}

export function dataEfetivaPrevista(doc: { dataPrevista: string | null; dataReprogramada: string | null }): {
  data: string | null;
  reprogramado: boolean;
} {
  if (doc.dataReprogramada) return { data: doc.dataReprogramada, reprogramado: true };
  return { data: doc.dataPrevista, reprogramado: false };
}
