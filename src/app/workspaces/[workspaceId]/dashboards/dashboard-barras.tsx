"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { STATUS_LABELS, STATUS_COR, type StatusDocumento } from "@/lib/statusGraph";
import type { DocumentoDashboard } from "@/services/dashboardService";

type Linha = { chave: string; rotulo: string; total: number; concluidos: number; cor?: string };

function Barras({ titulo, linhas }: { titulo: string; linhas: Linha[] }) {
  const maior = Math.max(1, ...linhas.map((l) => l.total));
  return (
    <Card>
      <CardHeader>
        <CardTitle>{titulo}</CardTitle>
      </CardHeader>
      <CardContent>
        {linhas.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum documento no filtro atual.</p>
        ) : (
          <div className="space-y-2.5">
            {linhas.map((l) => {
              const pct = Math.round((l.total / maior) * 100);
              const pctConcluido = l.total > 0 ? Math.round((l.concluidos / l.total) * 100) : 0;
              return (
                <div key={l.chave} className="grid grid-cols-[minmax(0,10rem)_1fr_auto] items-center gap-3 text-sm">
                  <span className="truncate text-muted-foreground" title={l.rotulo}>
                    {l.rotulo}
                  </span>
                  <div className="h-4 overflow-hidden rounded bg-muted">
                    <div
                      className={"h-full " + (l.cor ?? "bg-primary/70")}
                      style={{ width: `${pct}%` }}
                      title={`${l.total} documento(s)`}
                    />
                  </div>
                  <span className="tabular-nums text-muted-foreground">
                    {l.total}
                    <span className="ml-1.5 text-xs text-emerald-600 dark:text-emerald-400">{pctConcluido}%✓</span>
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function DashboardBarras({ documentos }: { documentos: DocumentoDashboard[] }) {
  const porDisciplina = useMemo<Linha[]>(() => {
    const m = new Map<string, { total: number; concluidos: number }>();
    for (const d of documentos) {
      const e = m.get(d.disciplinaNome) ?? { total: 0, concluidos: 0 };
      e.total++;
      if (d.fechado) e.concluidos++;
      m.set(d.disciplinaNome, e);
    }
    return [...m.entries()]
      .map(([nome, v]) => ({ chave: nome, rotulo: nome, ...v }))
      .sort((a, b) => b.total - a.total);
  }, [documentos]);

  const porStatus = useMemo<Linha[]>(() => {
    const m = new Map<StatusDocumento, number>();
    for (const d of documentos) m.set(d.status, (m.get(d.status) ?? 0) + 1);
    return [...m.entries()]
      .map(([s, total]) => ({
        chave: s,
        rotulo: STATUS_LABELS[s],
        total,
        concluidos: s === "liberado_para_construcao" ? total : 0,
        cor: STATUS_COR[s].ponto,
      }))
      .sort((a, b) => b.total - a.total);
  }, [documentos]);

  return (
    <div className="mb-6 grid gap-4 lg:grid-cols-2">
      <Barras titulo="Documentos por disciplina" linhas={porDisciplina} />
      <Barras titulo="Documentos por status" linhas={porStatus} />
    </div>
  );
}
