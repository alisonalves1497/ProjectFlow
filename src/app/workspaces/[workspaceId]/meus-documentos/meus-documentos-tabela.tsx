"use client";

import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, Search } from "lucide-react";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { ResizeHandle } from "@/components/ui/resize-handle";
import { StatusCell, PrazoCell, RevisaoCell, GedCell } from "@/components/documento-inline-cells";
import { STATUS_LABELS, type StatusDocumento } from "@/lib/statusGraph";
import { cn } from "@/lib/utils";
import type { MeusDocumentosLinha } from "@/services/painelService";

type LarguraColuna = "prazo" | "rev" | "ged" | "status";
// Status ganha mais espaço de largada — pedido do time pra sempre deixar mais espaço pra ele
// (mesmo critério aplicado na Lista de Documentos de uma Obra).
const LARGURAS_PADRAO: Record<LarguraColuna, number> = { prazo: 130, rev: 90, ged: 90, status: 220 };
const LARGURA_MINIMA = 48;

// Mesma linguagem visual da Lista de Documentos de uma Obra (tabela com cabeçalho de grupo
// colapsável, mesmas células editáveis) — só que agrupando por OBRA em vez de por Seção, já
// que "Meus Documentos" junta documentos de obras diferentes.
export function MeusDocumentosTabela({
  workspaceId,
  documentos,
  podeGerenciar,
}: {
  workspaceId: string;
  documentos: MeusDocumentosLinha[];
  podeGerenciar: boolean;
}) {
  const [statusFiltro, setStatusFiltro] = useState("");
  const [busca, setBusca] = useState("");
  const [colapsadas, setColapsadas] = useState<Set<string>>(new Set());
  const [larguras, setLarguras] = useState<Record<LarguraColuna, number>>(LARGURAS_PADRAO);

  // A alça fica na borda ESQUERDA da coluna — arrastar pra direita empurra essa borda pra
  // dentro da coluna e ela encolhe; "Código / Descrição" não tem largura própria (ocupa o
  // que sobra), então é ela quem absorve a diferença.
  function redimensionar(coluna: LarguraColuna, deltaX: number) {
    setLarguras((prev) => ({ ...prev, [coluna]: Math.max(LARGURA_MINIMA, prev[coluna] - deltaX) }));
  }

  const statusDisponiveis = useMemo(() => [...new Set(documentos.map((d) => d.status))], [documentos]);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return documentos.filter((d) => {
      if (statusFiltro && d.status !== statusFiltro) return false;
      if (termo && !d.codigoCompleto.toLowerCase().includes(termo) && !d.descricao.toLowerCase().includes(termo)) return false;
      return true;
    });
  }, [documentos, statusFiltro, busca]);

  const contadores = useMemo(
    () => ({
      total: filtrados.length,
      liberados: filtrados.filter((d) => d.status === "liberado_para_construcao").length,
      emAtraso: filtrados.filter((d) => d.emAtraso).length,
    }),
    [filtrados]
  );

  const grupos = useMemo(() => {
    const mapa = new Map<string, { obraId: string; obraNome: string; documentos: MeusDocumentosLinha[] }>();
    for (const d of filtrados) {
      if (!mapa.has(d.obraId)) mapa.set(d.obraId, { obraId: d.obraId, obraNome: d.obraNome, documentos: [] });
      mapa.get(d.obraId)!.documentos.push(d);
    }
    return [...mapa.values()].sort((a, b) => a.obraNome.localeCompare(b.obraNome, "pt"));
  }, [filtrados]);

  function toggleObra(obraId: string) {
    setColapsadas((prev) => {
      const next = new Set(prev);
      if (next.has(obraId)) next.delete(obraId);
      else next.add(obraId);
      return next;
    });
  }

  if (documentos.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhum documento atribuído a você.</p>;
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b pb-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <span>
            <span className="font-semibold">{contadores.total}</span> <span className="text-muted-foreground">Total</span>
          </span>
          <span>
            <span className="font-semibold">{contadores.liberados}</span> <span className="text-muted-foreground">Liberados</span>
          </span>
          <span>
            <span className="font-semibold">{contadores.emAtraso}</span> <span className="text-muted-foreground">Em atraso</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar..."
              className="h-8 w-40 rounded-md border bg-transparent pr-2 pl-7 text-xs"
            />
          </div>
          <select
            value={statusFiltro}
            onChange={(e) => setStatusFiltro(e.target.value)}
            className="h-8 rounded-md border bg-transparent px-2 text-xs"
          >
            <option value="">Todos os status ({documentos.length})</option>
            {statusDisponiveis.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]} ({documentos.filter((d) => d.status === s).length})
              </option>
            ))}
          </select>
        </div>
      </div>

      {grupos.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum documento com esse filtro.</p>
      ) : (
        <div className="rounded-lg border">
          <Table className="table-fixed">
            <TableHeader>
              <TableRow>
                <TableHead className="relative">Código / Descrição</TableHead>
                <TableHead className="relative" style={{ width: larguras.prazo }}>
                  Prazo
                  <ResizeHandle onResize={(d) => redimensionar("prazo", d)} />
                </TableHead>
                <TableHead className="relative" style={{ width: larguras.rev }}>
                  Rev.
                  <ResizeHandle onResize={(d) => redimensionar("rev", d)} />
                </TableHead>
                <TableHead className="relative" style={{ width: larguras.ged }}>
                  GED
                  <ResizeHandle onResize={(d) => redimensionar("ged", d)} />
                </TableHead>
                <TableHead className="relative" style={{ width: larguras.status }}>
                  Status
                  <ResizeHandle onResize={(d) => redimensionar("status", d)} />
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {grupos.map((g) => {
                const colapsada = colapsadas.has(g.obraId);
                return (
                  <Fragment key={g.obraId}>
                    <TableRow className="bg-blue-50 hover:bg-blue-50 dark:bg-blue-950/20 dark:hover:bg-blue-950/20">
                      <TableCell colSpan={5}>
                        <div className="flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => toggleObra(g.obraId)}
                            className="flex items-center gap-1.5 text-xs font-bold tracking-wide text-blue-900 uppercase hover:text-blue-950 dark:text-blue-300 dark:hover:text-blue-200"
                          >
                            <ChevronDown className={cn("size-3.5 shrink-0 transition-transform", colapsada && "-rotate-90")} />
                            {g.obraNome}
                          </button>
                          <span className="text-xs text-muted-foreground">{g.documentos.length} docs</span>
                        </div>
                      </TableCell>
                    </TableRow>
                    {!colapsada &&
                      g.documentos.map((d) => (
                        <TableRow key={d.id}>
                          <TableCell>
                            <Link href={`/workspaces/${workspaceId}/documentos/${d.id}`} className="block truncate hover:underline">
                              <span className="font-mono text-xs">{d.codigoCompleto}</span>{" "}
                              <span className="text-sm">{d.descricao}</span>
                            </Link>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            <PrazoCell
                              workspaceId={workspaceId}
                              projetoId={d.projetoId}
                              obraId={d.obraId}
                              documentoId={d.id}
                              dataPrevista={d.dataPrevista}
                              reprogramado={d.reprogramado}
                              podeGerenciar={podeGerenciar}
                            />
                          </TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            <RevisaoCell
                              workspaceId={workspaceId}
                              projetoId={d.projetoId}
                              obraId={d.obraId}
                              documentoId={d.id}
                              revisaoLabel={d.revisaoLabel}
                              temRevisao={d.temRevisao}
                              podeGerenciar={podeGerenciar}
                            />
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            <GedCell
                              workspaceId={workspaceId}
                              projetoId={d.projetoId}
                              obraId={d.obraId}
                              documentoId={d.id}
                              gedOrigem={d.gedOrigem}
                              podeGerenciar={podeGerenciar}
                            />
                          </TableCell>
                          <TableCell>
                            <StatusCell
                              workspaceId={workspaceId}
                              projetoId={d.projetoId}
                              obraId={d.obraId}
                              documentoId={d.id}
                              status={d.status as StatusDocumento}
                              podeGerenciar={podeGerenciar}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
