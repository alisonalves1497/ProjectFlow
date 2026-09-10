import { Badge } from "@/components/ui/badge";
import { STATUS_LABELS, STATUS_COR, type StatusDocumento } from "@/lib/statusGraph";

export function StatusBadge({ status }: { status: StatusDocumento }) {
  // variant="outline" só pra ter uma base sem fundo; a cor real vem do STATUS_COR
  // (o cn/twMerge deixa a classe do className vencer a do variant).
  return (
    <Badge variant="outline" className={STATUS_COR[status].badge}>
      {STATUS_LABELS[status]}
    </Badge>
  );
}
