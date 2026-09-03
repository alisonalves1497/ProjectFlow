import { Badge } from "@/components/ui/badge";

type GrdStatus = "pendente" | "respondido" | "cancelado";

const LABELS: Record<GrdStatus, string> = { pendente: "Pendente", respondido: "Respondido", cancelado: "Cancelado" };
const VARIANTS: Record<GrdStatus, "warning" | "success" | "destructive"> = {
  pendente: "warning",
  respondido: "success",
  cancelado: "destructive",
};

export function GrdStatusBadge({ status }: { status: GrdStatus }) {
  return <Badge variant={VARIANTS[status]}>{LABELS[status]}</Badge>;
}
