import { cn } from "@/lib/utils";
import type { StatusDocumento } from "@/lib/statusGraph";

// Etapa aproximada do ciclo de vida, só pra dar uma pista visual rápida na tabela —
// não é uma fonte de verdade (o StatusBadge ao lado já mostra o status exato).
const ETAPA: Record<StatusDocumento, number> = {
  previsto: 0,
  em_rascunho: 0,
  em_elaboracao: 1,
  devolvido_correcao: 1,
  em_revisao_interna: 2,
  aprovacao_lider_tecnico: 2,
  aguardando_envio_ged: 2,
  em_analise_cliente: 2,
  reprovado: 2,
  devolvido_pelo_cliente: 2,
  aprovado: 3,
  aprovado_com_comentarios: 3,
  liberado_para_construcao: 3,
  informativo: 3,
  cancelado: -1,
};

const ATENCAO: StatusDocumento[] = ["reprovado", "devolvido_pelo_cliente", "devolvido_correcao"];

export function FluxoIndicator({ status }: { status: StatusDocumento }) {
  const etapa = ETAPA[status];
  const emAtencao = ATENCAO.includes(status);

  return (
    <div className="flex items-center gap-0.5" title={`Etapa ${Math.max(etapa, 0)} de 3`}>
      {[1, 2, 3].map((i) => (
        <span
          key={i}
          className={cn(
            "h-1.5 w-4 rounded-full",
            etapa < 0
              ? "bg-muted"
              : i <= etapa
                ? emAtencao
                  ? "bg-destructive/70"
                  : "bg-primary/70"
                : "bg-muted"
          )}
        />
      ))}
    </div>
  );
}
