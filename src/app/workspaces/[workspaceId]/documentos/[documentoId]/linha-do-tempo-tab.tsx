import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { STATUS_LABELS, type StatusDocumento } from "@/lib/statusGraph";

type EventoTimeline = {
  id: string;
  evento: string;
  revisaoId: string | null;
  autorNome: string | null;
  metadata: unknown;
  createdAt: Date;
};

const RETORNO_STATUSES = ["aprovado", "aprovado_com_comentarios", "reprovado", "devolvido_pelo_cliente"];
const APROVADO_STATUSES = ["aprovado", "aprovado_com_comentarios", "liberado_para_construcao"];

function metadataPara(metadata: unknown): StatusDocumento | null {
  if (metadata && typeof metadata === "object" && "para" in metadata) return (metadata as { para: StatusDocumento }).para;
  return null;
}

function eventoLabel(evento: string, metadata: unknown): string {
  const para = metadataPara(metadata);
  switch (evento) {
    case "documento_criado":
      return "documento criado";
    case "revisao_criada":
      return "revisão criada";
    case "comentario_adicionado":
      return "comentário adicionado";
    case "arquivo_revisao_atualizado": {
      const tipo = metadata && typeof metadata === "object" && "tipo" in metadata ? (metadata as { tipo: string }).tipo : null;
      return tipo === "pdf" ? "PDF anexado" : "documento original anexado";
    }
    case "status_transicionado": {
      if (para === "em_analise_cliente") return "enviou para análise do cliente";
      if (para === "reprovado") return "reprovou o documento";
      if (para === "devolvido_pelo_cliente") return "documento devolvido pelo cliente";
      if (para === "devolvido_correcao") return "devolveu para correção";
      if (para === "aprovado" || para === "aprovado_com_comentarios") return "aprovou o documento";
      if (para === "liberado_para_construcao") return "liberou para construção";
      return para ? `mudou o status para ${STATUS_LABELS[para]}` : "mudou o status";
    }
    default:
      return evento.replace(/_/g, " ");
  }
}

function eventoDotColor(evento: string, metadata: unknown): string {
  if (evento === "revisao_criada" || evento === "documento_criado") return "bg-indigo-500";
  if (evento === "status_transicionado") {
    const para = metadataPara(metadata);
    if (para && APROVADO_STATUSES.includes(para)) return "bg-emerald-500";
    if (para === "reprovado" || para === "devolvido_pelo_cliente" || para === "cancelado") return "bg-red-500";
    if (para === "em_analise_cliente") return "bg-amber-500";
  }
  return "bg-slate-400";
}

function CardResumo({ label, valor, sub }: { label: string; valor: string; sub: string | null }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-[0.65rem] font-medium tracking-wide text-muted-foreground uppercase">{label}</p>
      <p className="mt-1 text-sm font-semibold">{valor}</p>
      {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

export function LinhaDoTempoTab({
  eventos,
  revisaoLabelPorId,
  documentoStatus,
  labelAtual,
}: {
  eventos: EventoTimeline[];
  revisaoLabelPorId: Record<string, string>;
  documentoStatus: StatusDocumento;
  labelAtual: string | null;
}) {
  const enviadas = eventos.filter((e) => e.evento === "status_transicionado" && metadataPara(e.metadata) === "em_analise_cliente");
  const retornos = eventos.filter((e) => {
    const para = metadataPara(e.metadata);
    return e.evento === "status_transicionado" && para && RETORNO_STATUSES.includes(para);
  });
  const aprovadas = eventos.filter((e) => {
    const para = metadataPara(e.metadata);
    return e.evento === "status_transicionado" && para && APROVADO_STATUSES.includes(para);
  });

  const ultimaEnviada = enviadas.at(-1) ?? null;
  const ultimoRetorno = retornos.at(-1) ?? null;
  const ultimaAprovada = aprovadas.at(-1) ?? null;

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <Clock className="size-4 shrink-0 text-foreground" />
        <p className="text-sm">
          <span className="font-bold">Linha do tempo do documento</span>
          <span className="text-muted-foreground"> ({eventos.length})</span>
        </p>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <CardResumo
          label="Última enviada"
          valor={ultimaEnviada ? new Date(ultimaEnviada.createdAt).toLocaleDateString("pt-BR") : "—"}
          sub={ultimaEnviada?.revisaoId ? `Rev. ${revisaoLabelPorId[ultimaEnviada.revisaoId] ?? "—"}` : null}
        />
        <CardResumo
          label="Último retorno"
          valor={ultimoRetorno ? STATUS_LABELS[metadataPara(ultimoRetorno.metadata)!] : "—"}
          sub={
            ultimoRetorno
              ? `Rev. ${ultimoRetorno.revisaoId ? (revisaoLabelPorId[ultimoRetorno.revisaoId] ?? "—") : "—"} · ${new Date(ultimoRetorno.createdAt).toLocaleDateString("pt-BR")}`
              : null
          }
        />
        <CardResumo
          label="Última aprovada"
          valor={ultimaAprovada ? new Date(ultimaAprovada.createdAt).toLocaleDateString("pt-BR") : "—"}
          sub={ultimaAprovada?.revisaoId ? `Rev. ${revisaoLabelPorId[ultimaAprovada.revisaoId] ?? "—"}` : null}
        />
        <CardResumo label="Vigente" valor={STATUS_LABELS[documentoStatus]} sub={labelAtual ? `Rev. ${labelAtual}` : null} />
      </div>

      {eventos.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum evento registrado ainda.</p>
      ) : (
        <ul className="space-y-4">
          {[...eventos].reverse().map((e) => (
            <li key={e.id} className="flex gap-3">
              <span className={cn("mt-1 size-2.5 shrink-0 rounded-full", eventoDotColor(e.evento, e.metadata))} />
              <div className="min-w-0">
                <p className="text-sm">
                  {e.revisaoId && (
                    <span className="mr-1.5 font-mono text-xs text-muted-foreground">Rev. {revisaoLabelPorId[e.revisaoId] ?? "—"}</span>
                  )}
                  <span className="font-medium">{eventoLabel(e.evento, e.metadata)}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(e.createdAt).toLocaleString("pt-BR")}
                  {e.autorNome && <> · {e.autorNome}</>}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
