import { Badge } from "@/components/ui/badge";
import type { StatusEfetivoCopiaControlada } from "@/services/copiaControladaService";

const LABELS: Record<StatusEfetivoCopiaControlada, string> = {
  ativa: "Ativa",
  a_substituir: "A substituir",
  substituida: "Substituída",
  cancelada: "Cancelada",
};
const VARIANTS: Record<StatusEfetivoCopiaControlada, "success" | "warning" | "outline" | "destructive"> = {
  ativa: "success",
  a_substituir: "warning",
  substituida: "outline",
  cancelada: "destructive",
};

export function CopiaControladaStatusBadge({ status }: { status: StatusEfetivoCopiaControlada }) {
  return <Badge variant={VARIANTS[status]}>{LABELS[status]}</Badge>;
}
