"use client";

import { HelpCircle, BellRing } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { STATUS_LABELS, STATUS_COR, type StatusDocumento } from "@/lib/statusGraph";

const STATUS_ORDEM: StatusDocumento[] = [
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
              <span className={`size-2 shrink-0 rounded-full ${STATUS_COR[s].ponto}`} />
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
