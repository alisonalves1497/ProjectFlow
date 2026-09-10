import { Card, CardContent } from "@/components/ui/card";
import type { DocumentoDashboard } from "@/services/dashboardService";

export function DashboardContadores({ documentos }: { documentos: DocumentoDashboard[] }) {
  const total = documentos.length;
  const concluidos = documentos.filter((d) => d.fechado).length;
  const emAtraso = documentos.filter((d) => d.emAtraso).length;
  const emAndamento = documentos.filter((d) => !d.fechado && !d.emAtraso).length;
  const pctConcluido = total > 0 ? Math.round((concluidos / total) * 100) : 0;

  const cards: { rotulo: string; valor: string | number; destaque?: "atraso" | "ok" }[] = [
    { rotulo: "Documentos", valor: total },
    { rotulo: "Concluídos", valor: concluidos, destaque: "ok" },
    { rotulo: "Em andamento", valor: emAndamento },
    { rotulo: "Em atraso", valor: emAtraso, destaque: emAtraso > 0 ? "atraso" : undefined },
    { rotulo: "% concluído", valor: `${pctConcluido}%`, destaque: "ok" },
  ];

  return (
    <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {cards.map((c) => (
        <Card key={c.rotulo}>
          <CardContent className="p-4">
            <p className="text-xs tracking-wide text-muted-foreground uppercase">{c.rotulo}</p>
            <p
              className={
                "mt-1 text-2xl font-semibold " +
                (c.destaque === "atraso" ? "text-destructive" : c.destaque === "ok" ? "text-emerald-600 dark:text-emerald-400" : "")
              }
            >
              {c.valor}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
