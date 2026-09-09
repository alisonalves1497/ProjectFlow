import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PontoCurvaAvanco } from "@/services/dashboardService";

function formatarSemana(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

export function DashboardCurvaAvanco({ pontos }: { pontos: PontoCurvaAvanco[] }) {
  const alturaMax = 160;
  const maiorTotal = Math.max(1, ...pontos.map((p) => p.total));
  const temHistorico = pontos.length > 1;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Curva de avanço</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">
            {temHistorico
              ? "Reconstruída a partir das trocas de status registradas na linha do tempo de cada documento."
              : "A partir de agora toda troca de status fica registrada — em algumas semanas esse gráfico começa a mostrar a evolução real ao longo do tempo. Por enquanto, só o retrato de hoje."}
          </p>

          {pontos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum documento nas obras que você acessa.</p>
          ) : (
            <div className="overflow-x-auto">
              <div className="flex items-end gap-3" style={{ height: alturaMax + 40 }}>
                {pontos.map((p) => {
                  const alturaConcluidos = (p.concluidos / maiorTotal) * alturaMax;
                  const alturaAndamento = (p.emAndamento / maiorTotal) * alturaMax;
                  const alturaCancelados = (p.cancelados / maiorTotal) * alturaMax;
                  return (
                    <div key={p.semana} className="flex w-14 shrink-0 flex-col items-center gap-1">
                      <div className="flex flex-col justify-end" style={{ height: alturaMax }}>
                        <div className="w-8 bg-zinc-400" style={{ height: alturaCancelados }} title={`Cancelados: ${p.cancelados}`} />
                        <div className="w-8 bg-amber-400" style={{ height: alturaAndamento }} title={`Em andamento: ${p.emAndamento}`} />
                        <div className="w-8 bg-emerald-500" style={{ height: alturaConcluidos }} title={`Concluídos: ${p.concluidos}`} />
                      </div>
                      <span className="text-[0.65rem] text-muted-foreground">{formatarSemana(p.semana)}</span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-sm bg-emerald-500" /> Concluído
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-sm bg-amber-400" /> Em andamento
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-sm bg-zinc-400" /> Cancelado
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
