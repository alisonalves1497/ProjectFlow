"use client";

import { Fragment, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { StatusDocumento } from "@/lib/statusGraph";

type Documento = {
  id: string;
  obraId: string;
  obraNome: string;
  disciplinaNome: string;
  status: StatusDocumento;
  fechado: boolean;
  emAtraso: boolean;
};

function BarraPercentual({ percentual }: { percentual: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-emerald-500" style={{ width: `${percentual}%` }} />
      </div>
      <span className="text-xs text-muted-foreground">{percentual}%</span>
    </div>
  );
}

function LinhaResumo({ nome, docs, negrito }: { nome: string; docs: Documento[]; negrito?: boolean }) {
  const total = docs.length;
  const concluidos = docs.filter((d) => d.fechado).length;
  const emAtraso = docs.filter((d) => d.emAtraso).length;
  const percentual = total > 0 ? Math.round((concluidos / total) * 100) : 0;
  return (
    <tr className={negrito ? "border-b bg-muted/40 font-semibold" : "border-b last:border-0"}>
      <td className={negrito ? "py-2 pr-4" : "py-2 pr-4 pl-4 text-muted-foreground"}>{nome}</td>
      <td className="py-2 pr-4">{total}</td>
      <td className="py-2 pr-4">{concluidos}</td>
      <td className="py-2 pr-4">{emAtraso > 0 ? <span className="text-destructive">{emAtraso}</span> : emAtraso}</td>
      <td className="py-2 pr-4">
        <BarraPercentual percentual={percentual} />
      </td>
    </tr>
  );
}

// Mesma ideia da aba "RESUMO-LOTE 03" da planilha de gestão de portfólio — obra por obra,
// disciplina por disciplina. Em vez de tentar encaixar nos 5 status do Excel (Liberado/Em
// análise/Em revisão/Em rascunho/Cancelado, que não batem 1:1 com os 15 status reais do
// sistema), usa os mesmos conceitos já usados no resto do app: fechado, em atraso, % concluído.
export function DashboardResumoObra({ documentos }: { documentos: Documento[] }) {
  const porObra = useMemo(() => {
    const mapa = new Map<string, { obraNome: string; docs: Documento[]; porDisciplina: Map<string, Documento[]> }>();
    for (const d of documentos) {
      if (!mapa.has(d.obraId)) mapa.set(d.obraId, { obraNome: d.obraNome, docs: [], porDisciplina: new Map() });
      const entrada = mapa.get(d.obraId)!;
      entrada.docs.push(d);
      if (!entrada.porDisciplina.has(d.disciplinaNome)) entrada.porDisciplina.set(d.disciplinaNome, []);
      entrada.porDisciplina.get(d.disciplinaNome)!.push(d);
    }
    return [...mapa.values()].sort((a, b) => b.docs.length - a.docs.length);
  }, [documentos]);

  if (porObra.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">Nenhum documento nas obras que você acessa.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Resumo por obra e disciplina</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs tracking-wide text-muted-foreground uppercase">
                <th className="py-2 pr-4">Obra / Disciplina</th>
                <th className="py-2 pr-4">Total</th>
                <th className="py-2 pr-4">Concluídos</th>
                <th className="py-2 pr-4">Em atraso</th>
                <th className="py-2 pr-4">% concluído</th>
              </tr>
            </thead>
            <tbody>
              {porObra.map((obra) => (
                <Fragment key={obra.obraNome}>
                  <LinhaResumo nome={obra.obraNome} docs={obra.docs} negrito />
                  {[...obra.porDisciplina.entries()]
                    .sort((a, b) => b[1].length - a[1].length)
                    .map(([disciplinaNome, docs]) => (
                      <LinhaResumo key={`${obra.obraNome}-${disciplinaNome}`} nome={disciplinaNome} docs={docs} />
                    ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
