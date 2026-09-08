"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { STATUS_LABELS, type StatusDocumento } from "@/lib/statusGraph";

type Documento = {
  id: string;
  codigoCompleto: string;
  descricao: string;
  status: StatusDocumento;
  obraId: string;
  obraNome: string;
  disciplinaNome: string;
  responsavelId: string | null;
  responsavelNome: string | null;
  dataPrevista: string | null;
  reprogramado: boolean;
  fechado: boolean;
  emAtraso: boolean;
};

function formatarData(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso + "T00:00:00").toLocaleDateString("pt-BR");
}

function Resumo(docs: Documento[]) {
  const total = docs.length;
  const concluidos = docs.filter((d) => d.fechado).length;
  const emAtraso = docs.filter((d) => d.emAtraso).length;
  const percentual = total > 0 ? Math.round((concluidos / total) * 100) : 0;
  return { total, concluidos, emAtraso, percentual };
}

export function DashboardResponsavel({ documentos, workspaceId }: { documentos: Documento[]; workspaceId: string }) {
  const [responsavelId, setResponsavelId] = useState<string>("");
  const [statusFiltro, setStatusFiltro] = useState<string>("");

  const responsaveis = useMemo(() => {
    const mapa = new Map<string, string>();
    for (const d of documentos) {
      if (d.responsavelId) mapa.set(d.responsavelId, d.responsavelNome ?? "—");
    }
    return [...mapa.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [documentos]);

  // Visão geral por pessoa — útil pra comparar carga de trabalho e andamento entre a equipe
  // sem precisar entrar um por um.
  const visaoGeral = useMemo(() => {
    return responsaveis.map(([id, nome]) => {
      const docsPessoa = documentos.filter((d) => d.responsavelId === id);
      return { id, nome, ...Resumo(docsPessoa) };
    });
  }, [responsaveis, documentos]);

  const docsDaPessoa = useMemo(() => {
    if (!responsavelId) return [];
    let lista = documentos.filter((d) => d.responsavelId === responsavelId);
    if (statusFiltro) lista = lista.filter((d) => d.status === statusFiltro);
    return [...lista].sort((a, b) => {
      if (a.dataPrevista === null) return 1;
      if (b.dataPrevista === null) return -1;
      return a.dataPrevista < b.dataPrevista ? -1 : 1;
    });
  }, [documentos, responsavelId, statusFiltro]);

  const statusDaPessoa = useMemo(() => {
    const lista = documentos.filter((d) => d.responsavelId === responsavelId);
    return [...new Set(lista.map((d) => d.status))];
  }, [documentos, responsavelId]);

  const resumoPessoa = Resumo(documentos.filter((d) => d.responsavelId === responsavelId));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Responsável</label>
          <select
            value={responsavelId}
            onChange={(e) => {
              setResponsavelId(e.target.value);
              setStatusFiltro("");
            }}
            className="h-9 min-w-56 rounded-md border bg-card px-3 text-sm"
          >
            <option value="">Selecione um responsável...</option>
            {responsaveis.map(([id, nome]) => (
              <option key={id} value={id}>
                {nome}
              </option>
            ))}
          </select>
        </div>
        {responsavelId && (
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Status</label>
            <select value={statusFiltro} onChange={(e) => setStatusFiltro(e.target.value)} className="h-9 rounded-md border bg-card px-3 text-sm">
              <option value="">Todos os status</option>
              {statusDaPessoa.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {!responsavelId ? (
        <Card>
          <CardHeader>
            <CardTitle>Visão geral por responsável</CardTitle>
          </CardHeader>
          <CardContent>
            {visaoGeral.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum documento com responsável atribuído.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs tracking-wide text-muted-foreground uppercase">
                      <th className="py-2 pr-4">Responsável</th>
                      <th className="py-2 pr-4">Total</th>
                      <th className="py-2 pr-4">Concluídos</th>
                      <th className="py-2 pr-4">Em atraso</th>
                      <th className="py-2 pr-4">% concluído</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visaoGeral
                      .sort((a, b) => b.total - a.total)
                      .map((r) => (
                        <tr key={r.id} className="border-b last:border-0">
                          <td className="py-2 pr-4">
                            <button type="button" onClick={() => setResponsavelId(r.id)} className="hover:underline">
                              {r.nome}
                            </button>
                          </td>
                          <td className="py-2 pr-4">{r.total}</td>
                          <td className="py-2 pr-4">{r.concluidos}</td>
                          <td className="py-2 pr-4">
                            {r.emAtraso > 0 ? <span className="text-destructive">{r.emAtraso}</span> : r.emAtraso}
                          </td>
                          <td className="py-2 pr-4">
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                                <div className="h-full bg-emerald-500" style={{ width: `${r.percentual}%` }} />
                              </div>
                              <span className="text-xs text-muted-foreground">{r.percentual}%</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Card size="sm">
              <CardHeader className="pb-1">
                <CardTitle>Total</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xl font-semibold">{resumoPessoa.total}</p>
              </CardContent>
            </Card>
            <Card size="sm">
              <CardHeader className="pb-1">
                <CardTitle>Concluídos</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xl font-semibold">{resumoPessoa.concluidos}</p>
              </CardContent>
            </Card>
            <Card size="sm">
              <CardHeader className="pb-1">
                <CardTitle>Em atraso</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xl font-semibold">{resumoPessoa.emAtraso}</p>
              </CardContent>
            </Card>
            <Card size="sm">
              <CardHeader className="pb-1">
                <CardTitle>% concluído</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xl font-semibold">{resumoPessoa.percentual}%</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Cronograma — {responsaveis.find(([id]) => id === responsavelId)?.[1]}</CardTitle>
            </CardHeader>
            <CardContent>
              {docsDaPessoa.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum documento com esse filtro.</p>
              ) : (
                <ul className="space-y-2">
                  {docsDaPessoa.map((d) => (
                    <li key={d.id} className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm">
                      <Link href={`/workspaces/${workspaceId}/documentos/${d.id}`} className="min-w-0 hover:underline">
                        <span className="font-mono text-xs">{d.codigoCompleto}</span>{" "}
                        <span className="text-muted-foreground">{d.descricao}</span>
                        <span className="ml-1 text-xs text-muted-foreground">
                          ({d.obraNome} · {d.disciplinaNome})
                        </span>
                      </Link>
                      <div className="flex shrink-0 items-center gap-3">
                        <span className={d.emAtraso ? "text-destructive" : "text-muted-foreground"}>
                          {formatarData(d.dataPrevista)}
                          {d.reprogramado && <span className="ml-1 text-xs">(reprog.)</span>}
                        </span>
                        <StatusBadge status={d.status} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
