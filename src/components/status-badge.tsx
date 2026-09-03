import { Badge } from "@/components/ui/badge";
import { STATUS_LABELS, type StatusDocumento } from "@/lib/statusGraph";

type BadgeVariant = "success" | "warning" | "destructive" | "secondary";

const VARIANT: Record<StatusDocumento, BadgeVariant> = {
  previsto: "warning",
  em_elaboracao: "warning",
  devolvido_correcao: "warning",
  em_revisao_interna: "warning",
  aprovacao_lider_tecnico: "warning",
  aguardando_envio_ged: "warning",
  em_analise_cliente: "warning",
  aprovado: "success",
  aprovado_com_comentarios: "success",
  liberado_para_construcao: "success",
  reprovado: "destructive",
  devolvido_pelo_cliente: "destructive",
  cancelado: "destructive",
  informativo: "secondary",
};

export function StatusBadge({ status }: { status: StatusDocumento }) {
  return <Badge variant={VARIANT[status]}>{STATUS_LABELS[status]}</Badge>;
}
