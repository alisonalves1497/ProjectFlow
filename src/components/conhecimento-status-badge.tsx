import { Badge } from "@/components/ui/badge";
import { STATUS_LABELS, type StatusItemConhecimento } from "@/lib/conhecimentoStatusGraph";

const VARIANTS: Record<StatusItemConhecimento, "warning" | "success" | "outline" | "secondary"> = {
  aberta: "warning",
  em_analise: "warning",
  respondida: "secondary",
  em_correcao: "warning",
  corrigida: "secondary",
  verificada: "secondary",
  fechada: "success",
};

export function ConhecimentoStatusBadge({ status }: { status: StatusItemConhecimento }) {
  return <Badge variant={VARIANTS[status]}>{STATUS_LABELS[status]}</Badge>;
}
