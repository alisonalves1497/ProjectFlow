"use client";

import { HelpCircle, BellRing } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { STATUS_LABELS, type StatusDocumento } from "@/lib/statusGraph";

const STATUS_COR: Record<StatusDocumento, string> = {
  previsto: "bg-amber-400",
  em_elaboracao: "bg-amber-400",
  devolvido_correcao: "bg-amber-400",
  em_revisao_interna: "bg-amber-400",
  aprovacao_lider_tecnico: "bg-amber-400",
  aguardando_envio_ged: "bg-amber-400",
  em_analise_cliente: "bg-amber-400",
  aprovado: "bg-emerald-500",
  aprovado_com_comentarios: "bg-emerald-500",
  liberado_para_construcao: "bg-emerald-500",
  reprovado: "bg-red-500",
  devolvido_pelo_cliente: "bg-red-500",
  cancelado: "bg-red-500",
  informativo: "bg-slate-400",
};

const STATUS_ORDEM: StatusDocumento[] = [
  "previsto",
  "em_elaboracao",
  "devolvido_correcao",
  "em_revisao_interna",
  "aprovacao_lider_tecnico",
  "aguardando_envio_ged",
  "em_analise_cliente",
  "aprovado",
  "aprovado_com_comentarios",
  "liberado_para_construcao",
  "reprovado",
  "devolvido_pelo_cliente",
  "informativo",
  "cancelado",
];

export function LegendaPopover({ className }: { className?: string }) {
  return (
    <Popover>
      <PopoverTrigger render={<button type="button" className={className ?? "text-muted-foreground hover:text-foreground"} title="Legenda" />}>
        <HelpCircle className="size-4" />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72">
        <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Status</p>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
          {STATUS_ORDEM.map((s) => (
            <span key={s} className="flex items-center gap-1.5 text-xs">
              <span className={`size-2 shrink-0 rounded-full ${STATUS_COR[s]}`} />
              {STATUS_LABELS[s]}
            </span>
          ))}
        </div>

        <p className="mt-4 mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Fluxo (etapas)</p>
        <div className="space-y-1.5 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-4 rounded-full bg-primary/70" /> Elaboração / Revisão / Análise
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-4 rounded-full bg-emerald-500/70" /> Aprovado / Liberado / Informativo
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-4 rounded-full bg-destructive/70" /> Devolvido / Reprovado (atenção)
          </span>
        </div>

        <p className="mt-4 mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Marcadores</p>
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <BellRing className="size-3.5 shrink-0 text-primary" /> Atualizado desde sua última visita
        </span>
      </PopoverContent>
    </Popover>
  );
}
