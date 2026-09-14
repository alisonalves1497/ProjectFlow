"use client";

import Link from "next/link";
import { Fragment, useActionState, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FluxoIndicator } from "@/components/fluxo-indicator";
import { BellRing, CircleCheck, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { type StatusDocumento } from "@/lib/statusGraph";
import type { GrupoSecaoDocumentos } from "@/services/documentoService";
import { StatusCell, ResponsavelCell, PrazoCell, RevisaoCell } from "@/components/documento-inline-cells";
import { FavoritoButton } from "./favorito-button";
import { CreateGrdDialog } from "../../../../grds/create-grd-dialog";
import { CreateDocumentoDialog } from "../../../../documentos/create-documento-dialog";
import { RenameSecaoDialog } from "./rename-secao-dialog";
import {
  bulkMoverSecaoAction,
  bulkAtribuirAction,
  bulkReprogramarAction,
  bulkExcluirAction,
  type ActionState,
} from "../../../../documentos/actions";

const initialActionState: ActionState = { status: "idle" };

const CHECKBOX_CLASS = "checkbox-custom";

type Disciplina = { disciplinaId: string; code: string; name: string; secoes: { id: string; name: string }[] };
type Catalogo = { id: string; code: string; name: string };
type Usuario = { userId: string; name: string | null; email: string };
type Contato = { id: string; nome: string; email: string };

function ResumoSecao({ total, concluidos, percentual }: { total: number; concluidos: number; percentual: number }) {
  if (total > 0 && concluidos === total) {
    return (
      <div className="flex items-center gap-2 text-xs">
        <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
          <CircleCheck className="size-3.5" />
          Fechado
        </span>
        <span className="text-emerald-700/70 dark:text-emerald-400/70">
          {total} doc{total > 1 ? "s" : ""}
        </span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-emerald-500" style={{ width: `${percentual}%` }} />
      </div>
      <span className="text-xs text-muted-foreground">
        {total} doc{total !== 1 ? "s" : ""}
      </span>
    </div>
  );
}

// StatusCell, ResponsavelCell, PrazoCell e RevisaoCell moraram aqui — agora ficam em
// @/components/documento-inline-cells (reaproveitadas também em Meus Documentos).

export type ColunasVisiveis = { resp: boolean; prazo: boolean; fluxo: boolean; rev: boolean; ged: boolean; status: boolean };

// Fluxo começa oculta por pedido — quem quiser vê liga de novo no popover de Colunas.
export const COLUNAS_PADRAO: ColunasVisiveis = { resp: true, prazo: true, fluxo: false, rev: true, ged: true, status: true };

type LarguraColuna = "resp" | "prazo" | "fluxo" | "rev" | "ged" | "status";
const LARGURAS_PADRAO: Record<LarguraColuna, number> = { resp: 112, prazo: 96, fluxo: 96, rev: 56, ged: 88, status: 176 };
const LARGURA_MINIMA = 48;

// Alça de redimensionar: fica em cima do "traço" divisório de cada coluna (borda direita
// do header). Arrastar pra direita alarga a coluna, pra esquerda estreita — tudo em estado
// local, só dura a sessão (não precisa persistir entre recarregamentos).
function ResizeHandle({ onResize }: { onResize: (deltaX: number) => void }) {
  function onMouseDown(e: React.MouseEvent) {
    e.preventDefault();
    const xInicial = e.clientX;
    let ultimoX = xInicial;

    function onMouseMove(ev: MouseEvent) {
      const deltaX = ev.clientX - ultimoX;
      ultimoX = ev.clientX;
      onResize(deltaX);
    }
    function onMouseUp() {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    }
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }

  return (
    <div
      onMouseDown={onMouseDown}
      role="separator"
      aria-orientation="vertical"
      className="absolute top-0 left-0 z-10 h-full w-2 -translate-x-1/2 cursor-col-resize touch-none select-none"
    >
      <div className="mx-auto h-full w-px bg-border" />
    </div>
  );
}

export function DocumentosLista({
  workspaceId,
  projetoId,
  obraId,
  grupos,
  agrupado,
  disciplinas,
  fases,
  tipos,
  usuarios,
  contatos,
  documentosAtualizadosIds,
  colunasVisiveis,
  secoesColapsadas,
  onToggleSecao,
  filtroAtivo,
  podeGerenciar,
}: {
  workspaceId: string;
  projetoId: string;
  obraId: string;
  grupos: GrupoSecaoDocumentos[];
  agrupado: boolean;
  disciplinas: Disciplina[];
  fases: Catalogo[];
  tipos: Catalogo[];
  usuarios: Usuario[];
  contatos: Contato[];
  documentosAtualizadosIds: Set<string>;
  colunasVisiveis: ColunasVisiveis;
  secoesColapsadas: Set<string>;
  onToggleSecao: (secaoId: string) => void;
  filtroAtivo: boolean;
  podeGerenciar: boolean;
}) {
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [moverOpen, setMoverOpen] = useState(false);
  const [atribuirOpen, setAtribuirOpen] = useState(false);
  const [reprogramarOpen, setReprogramarOpen] = useState(false);
  const [grdOpen, setGrdOpen] = useState(false);
  const [excluirOpen, setExcluirOpen] = useState(false);
  const [larguras, setLarguras] = useState<Record<LarguraColuna, number>>(LARGURAS_PADRAO);

  // A alça fica na borda ESQUERDA da coluna (onde ficava o "traço" divisório antigo) — arrastar
  // pra direita empurra essa borda pra dentro da coluna e ela encolhe; a coluna "Código /
  // Descrição" não tem largura própria (ocupa o que sobra), então ela sozinha absorve a
  // diferença, então tanto faz qual das outras colunas você arrasta.
  function redimensionar(coluna: LarguraColuna, deltaX: number) {
    setLarguras((prev) => ({ ...prev, [coluna]: Math.max(LARGURA_MINIMA, prev[coluna] - deltaX) }));
  }

  const todosDocumentos = useMemo(() => grupos.flatMap((g) => g.documentos), [grupos]);

  function toggle(id: string) {
    setSelecionados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleTodos(ids: string[]) {
    setSelecionados((prev) => {
      const todosMarcados = ids.every((id) => prev.has(id));
      const next = new Set(prev);
      for (const id of ids) {
        if (todosMarcados) next.delete(id);
        else next.add(id);
      }
      return next;
    });
  }

  function limparSelecao() {
    setSelecionados(new Set());
  }

  function linhaDocumento(d: GrupoSecaoDocumentos["documentos"][number]) {
    return (
      <TableRow key={d.id}>
        <TableCell className="w-8">
          <input
            type="checkbox"
            checked={selecionados.has(d.id)}
            onChange={() => toggle(d.id)}
            aria-label={`Selecionar ${d.codigoCompleto}`}
            className={CHECKBOX_CLASS}
          />
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-1.5">
            <FavoritoButton workspaceId={workspaceId} documentoId={d.id} favoritoInicial={d.favorito} />
            <div className="min-w-0">
              <Link href={`/workspaces/${workspaceId}/documentos/${d.id}`} className="block truncate font-mono text-xs hover:underline">
                {d.codigoCompleto}
              </Link>
              <p className="truncate text-sm">{d.descricao}</p>
            </div>
            {documentosAtualizadosIds.has(d.id) && (
              <BellRing className="size-3.5 shrink-0 text-primary" aria-label="Atualizado desde sua última visita" />
            )}
          </div>
        </TableCell>
        {colunasVisiveis.resp && (
          <TableCell className="text-muted-foreground">
            <ResponsavelCell
              workspaceId={workspaceId}
              projetoId={projetoId}
              obraId={obraId}
              documentoId={d.id}
              responsavelId={d.responsavelId}
              responsavelNome={d.responsavelNome}
              usuarios={usuarios}
            />
          </TableCell>
        )}
        {colunasVisiveis.prazo && (
          <TableCell className="text-muted-foreground">
            <PrazoCell
              workspaceId={workspaceId}
              projetoId={projetoId}
              obraId={obraId}
              documentoId={d.id}
              dataPrevista={d.dataPrevista}
              reprogramado={d.reprogramado}
              podeGerenciar={podeGerenciar}
            />
          </TableCell>
        )}
        {colunasVisiveis.fluxo && (
          <TableCell>
            <FluxoIndicator status={d.status as StatusDocumento} />
          </TableCell>
        )}
        {colunasVisiveis.rev && (
          <TableCell className="font-mono text-xs text-muted-foreground">
            <RevisaoCell
              workspaceId={workspaceId}
              projetoId={projetoId}
              obraId={obraId}
              documentoId={d.id}
              revisaoLabel={d.revisaoLabel}
              temRevisao={d.temRevisao}
              podeGerenciar={podeGerenciar}
            />
          </TableCell>
        )}
        {colunasVisiveis.ged && (
          <TableCell className="text-xs text-muted-foreground">{d.gedOrigem ?? "—"}</TableCell>
        )}
        {colunasVisiveis.status && (
          <TableCell>
            <StatusCell
              workspaceId={workspaceId}
              projetoId={projetoId}
              obraId={obraId}
              documentoId={d.id}
              status={d.status as StatusDocumento}
              podeGerenciar={podeGerenciar}
            />
          </TableCell>
        )}
      </TableRow>
    );
  }

  const colSpanResto = 1 + Object.values(colunasVisiveis).filter(Boolean).length;

  function cabecalhoTabela() {
    return (
      <TableHeader>
        <TableRow>
          <TableHead className="w-8" />
          <TableHead className="relative">Código / Descrição</TableHead>
          {colunasVisiveis.resp && (
            <TableHead className="relative" style={{ width: larguras.resp }}>
              Resp.
              <ResizeHandle onResize={(d) => redimensionar("resp", d)} />
            </TableHead>
          )}
          {colunasVisiveis.prazo && (
            <TableHead className="relative" style={{ width: larguras.prazo }}>
              Prazo
              <ResizeHandle onResize={(d) => redimensionar("prazo", d)} />
            </TableHead>
          )}
          {colunasVisiveis.fluxo && (
            <TableHead className="relative" style={{ width: larguras.fluxo }}>
              Fluxo
              <ResizeHandle onResize={(d) => redimensionar("fluxo", d)} />
            </TableHead>
          )}
          {colunasVisiveis.rev && (
            <TableHead className="relative" style={{ width: larguras.rev }}>
              Rev.
              <ResizeHandle onResize={(d) => redimensionar("rev", d)} />
            </TableHead>
          )}
          {colunasVisiveis.ged && (
            <TableHead className="relative" style={{ width: larguras.ged }}>
              GED
              <ResizeHandle onResize={(d) => redimensionar("ged", d)} />
            </TableHead>
          )}
          {colunasVisiveis.status && (
            <TableHead className="relative" style={{ width: larguras.status }}>
              Status
              <ResizeHandle onResize={(d) => redimensionar("status", d)} />
            </TableHead>
          )}
        </TableRow>
      </TableHeader>
    );
  }

  function linhaCabecalhoSecao(g: GrupoSecaoDocumentos) {
    const ids = g.documentos.map((d) => d.id);
    const colapsada = secoesColapsadas.has(g.secaoId);
    const fechada = g.total > 0 && g.concluidos === g.total;
    return (
      <TableRow
        key={`sec-${g.secaoId}`}
        className={cn(
          fechada
            ? "bg-emerald-50 hover:bg-emerald-50 dark:bg-emerald-950/30 dark:hover:bg-emerald-950/30"
            : "bg-blue-100 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-950/40"
        )}
      >
        <TableCell className="w-8">
          {ids.length > 0 && (
            <input
              type="checkbox"
              checked={ids.every((id) => selecionados.has(id))}
              onChange={() => toggleTodos(ids)}
              aria-label={`Selecionar todos de ${g.disciplinaName} - ${g.secaoName}`}
              className={CHECKBOX_CLASS}
            />
          )}
        </TableCell>
        <TableCell colSpan={colSpanResto}>
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => onToggleSecao(g.secaoId)}
              className={cn(
                "flex items-center gap-1.5 text-xs font-bold tracking-wide uppercase",
                fechada
                  ? "text-emerald-700 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300"
                  : "text-blue-900 hover:text-blue-950 dark:text-blue-300 dark:hover:text-blue-200"
              )}
            >
              <ChevronDown className={cn("size-3.5 shrink-0 transition-transform", colapsada && "-rotate-90")} />
              {g.disciplinaName} - {g.secaoName}
            </button>
            <div className="flex items-center gap-2">
              {podeGerenciar && (
                <RenameSecaoDialog
                  workspaceId={workspaceId}
                  projetoId={projetoId}
                  obraId={obraId}
                  secaoId={g.secaoId}
                  nomeAtual={g.secaoName}
                />
              )}
              <ResumoSecao total={g.total} concluidos={g.concluidos} percentual={g.percentualConcluido} />
            </div>
          </div>
        </TableCell>
      </TableRow>
    );
  }

  // Linha fina abaixo do título da seção — atalho pra criar documento já com disciplina/seção
  // dessa linha marcadas, sem precisar escolher tudo de novo no diálogo "+ Novo" do topo (que
  // sempre abre com a primeira disciplina/seção da obra).
  function linhaAdicionarDocumento(g: GrupoSecaoDocumentos) {
    return (
      <TableRow key={`add-${g.secaoId}`} className="hover:bg-accent/40">
        <TableCell />
        <TableCell colSpan={colSpanResto} className="p-0">
          <CreateDocumentoDialog
            workspaceId={workspaceId}
            projetoId={projetoId}
            obraId={obraId}
            disciplinas={disciplinas}
            fases={fases}
            tipos={tipos}
            disciplinaIdInicial={g.disciplinaId}
            secaoIdInicial={g.secaoId}
            triggerCompacto
            trigger={
              <button
                type="button"
                className="flex w-full items-center justify-end py-1 pr-4 text-muted-foreground hover:text-primary"
                title={`Novo documento em ${g.disciplinaName} - ${g.secaoName}`}
              />
            }
          />
        </TableCell>
      </TableRow>
    );
  }

  return (
    <div>
      {selecionados.size > 0 && (
        <div className="mb-4 flex items-center justify-between rounded-md border bg-card px-4 py-2">
          <span className="text-sm">{selecionados.size} selecionado(s)</span>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setMoverOpen(true)}>
              Mover
            </Button>
            <Button size="sm" variant="outline" onClick={() => setAtribuirOpen(true)}>
              Atribuir
            </Button>
            <Button size="sm" variant="outline" onClick={() => setReprogramarOpen(true)}>
              Reprogramar
            </Button>
            <Button size="sm" variant="outline" onClick={() => setGrdOpen(true)}>
              Criar GRD
            </Button>
            {podeGerenciar && (
              <Button size="sm" variant="outline" className="text-destructive hover:text-destructive" onClick={() => setExcluirOpen(true)}>
                Excluir
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={limparSelecao}>
              Limpar
            </Button>
          </div>
        </div>
      )}

      {agrupado ? (
        <div className="rounded-lg border">
          <Table className="table-fixed">
            {cabecalhoTabela()}
            <TableBody>
              {grupos.map((g) => {
                // Com filtro ativo (status/toggles/busca), seção sem documento nenhum bate com o
                // filtro é ruído — some da lista. Sem filtro, continua mostrando "vazia" (útil pra
                // ver a estrutura do catálogo).
                if (filtroAtivo && g.documentos.length === 0) return null;

                const colapsada = secoesColapsadas.has(g.secaoId);
                return (
                  <Fragment key={g.secaoId}>
                    {linhaCabecalhoSecao(g)}
                    {!colapsada && podeGerenciar && linhaAdicionarDocumento(g)}
                    {colapsada
                      ? null
                      : g.documentos.length === 0
                        ? (
                            <TableRow>
                              <TableCell />
                              <TableCell colSpan={colSpanResto} className="text-sm text-muted-foreground">
                                Nenhum documento nesta seção.
                              </TableCell>
                            </TableRow>
                          )
                        : g.documentos.map(linhaDocumento)}
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        </div>
      ) : todosDocumentos.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum documento encontrado.</p>
      ) : (
        <div className="rounded-lg border">
          <Table className="table-fixed">
            {cabecalhoTabela()}
            <TableBody>{todosDocumentos.map(linhaDocumento)}</TableBody>
          </Table>
        </div>
      )}

      <MoverSecaoDialog
        open={moverOpen}
        onOpenChange={setMoverOpen}
        workspaceId={workspaceId}
        projetoId={projetoId}
        obraId={obraId}
        documentoIds={[...selecionados]}
        disciplinas={disciplinas}
        onSuccess={limparSelecao}
      />
      <ExcluirDialog
        open={excluirOpen}
        onOpenChange={setExcluirOpen}
        workspaceId={workspaceId}
        projetoId={projetoId}
        obraId={obraId}
        documentoIds={[...selecionados]}
        quantidade={selecionados.size}
        onSuccess={limparSelecao}
      />
      <AtribuirDialog
        open={atribuirOpen}
        onOpenChange={setAtribuirOpen}
        workspaceId={workspaceId}
        projetoId={projetoId}
        obraId={obraId}
        documentoIds={[...selecionados]}
        usuarios={usuarios}
        onSuccess={limparSelecao}
      />
      <ReprogramarDialog
        open={reprogramarOpen}
        onOpenChange={setReprogramarOpen}
        workspaceId={workspaceId}
        projetoId={projetoId}
        obraId={obraId}
        documentoIds={[...selecionados]}
        onSuccess={limparSelecao}
      />
      <CreateGrdDialog
        workspaceId={workspaceId}
        projetoId={projetoId}
        obraId={obraId}
        documentos={todosDocumentos.map((d) => ({ id: d.id, codigoCompleto: d.codigoCompleto, descricao: d.descricao, temRevisao: d.temRevisao }))}
        contatos={contatos}
        initialSelectedDocumentoIds={[...selecionados]}
        open={grdOpen}
        onOpenChange={(v) => {
          setGrdOpen(v);
          if (!v) limparSelecao();
        }}
        trigger={<span />}
      />
    </div>
  );
}

function MoverSecaoDialog({
  open,
  onOpenChange,
  workspaceId,
  projetoId,
  obraId,
  documentoIds,
  disciplinas,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  workspaceId: string;
  projetoId: string;
  obraId: string;
  documentoIds: string[];
  disciplinas: Disciplina[];
  onSuccess: () => void;
}) {
  const [state, formAction, pending] = useActionState(bulkMoverSecaoAction, initialActionState);
  const temSecao = disciplinas.some((d) => d.secoes.length > 0);

  useEffect(() => {
    if (state.status === "success") {
      onOpenChange(false);
      onSuccess();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só dispara uma vez por submissão bem-sucedida;
    // incluir onOpenChange/onSuccess reintroduz o loop (a referência muda a cada render do pai).
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mover pra outra seção</DialogTitle>
          <DialogDescription>
            Pode mover pra uma seção de outra disciplina — os documentos passam a valer pra essa disciplina nova. Só o
            código deles não muda sozinho (ele carrega a disciplina antiga); ajuste na tela do documento se precisar.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="workspaceId" value={workspaceId} />
          <input type="hidden" name="projetoId" value={projetoId} />
          <input type="hidden" name="obraId" value={obraId} />
          {documentoIds.map((id) => (
            <input key={id} type="hidden" name="documentoIds" value={id} />
          ))}
          <div className="space-y-2">
            <Label htmlFor="secaoId">Nova seção</Label>
            <select id="secaoId" name="secaoId" required className="h-9 w-full rounded-md border bg-transparent px-3 text-sm">
              {!temSecao && <option value="">Nenhuma seção disponível</option>}
              {disciplinas.map(
                (d) =>
                  d.secoes.length > 0 && (
                    <optgroup key={d.disciplinaId} label={d.name}>
                      {d.secoes.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </optgroup>
                  )
              )}
            </select>
          </div>
          {state.status === "error" && <p className="text-sm text-destructive">{state.error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={pending || !temSecao}>
              {pending ? "Movendo..." : "Mover"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ExcluirDialog({
  open,
  onOpenChange,
  workspaceId,
  projetoId,
  obraId,
  documentoIds,
  quantidade,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  workspaceId: string;
  projetoId: string;
  obraId: string;
  documentoIds: string[];
  quantidade: number;
  onSuccess: () => void;
}) {
  const [state, formAction, pending] = useActionState(bulkExcluirAction, initialActionState);

  useEffect(() => {
    if (state.status === "success") {
      onOpenChange(false);
      onSuccess();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só dispara uma vez por submissão bem-sucedida
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Excluir {quantidade} documento{quantidade > 1 ? "s" : ""}?</DialogTitle>
          <DialogDescription>
            Isso oculta o{quantidade > 1 ? "s" : ""} documento{quantidade > 1 ? "s" : ""} selecionado{quantidade > 1 ? "s" : ""}.
            Nada é apagado de verdade — fica guardado por 30 dias na Lixeira, de onde dá pra restaurar.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="workspaceId" value={workspaceId} />
          <input type="hidden" name="projetoId" value={projetoId} />
          <input type="hidden" name="obraId" value={obraId} />
          {documentoIds.map((id) => (
            <input key={id} type="hidden" name="documentoIds" value={id} />
          ))}
          {state.status === "error" && <p className="text-sm text-destructive">{state.error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="destructive" disabled={pending}>
              {pending ? "Excluindo..." : "Sim, excluir"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AtribuirDialog({
  open,
  onOpenChange,
  workspaceId,
  projetoId,
  obraId,
  documentoIds,
  usuarios,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  workspaceId: string;
  projetoId: string;
  obraId: string;
  documentoIds: string[];
  usuarios: Usuario[];
  onSuccess: () => void;
}) {
  const [state, formAction, pending] = useActionState(bulkAtribuirAction, initialActionState);

  useEffect(() => {
    if (state.status === "success") {
      onOpenChange(false);
      onSuccess();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só dispara uma vez por submissão bem-sucedida;
    // incluir onOpenChange/onSuccess reintroduz o loop (a referência muda a cada render do pai).
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Atribuir responsável</DialogTitle>
          <DialogDescription>Só usuários com acesso a esta obra podem ser escolhidos.</DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="workspaceId" value={workspaceId} />
          <input type="hidden" name="projetoId" value={projetoId} />
          <input type="hidden" name="obraId" value={obraId} />
          {documentoIds.map((id) => (
            <input key={id} type="hidden" name="documentoIds" value={id} />
          ))}
          <div className="space-y-2">
            <Label htmlFor="responsavelId">Responsável</Label>
            <select id="responsavelId" name="responsavelId" required className="h-9 w-full rounded-md border bg-transparent px-3 text-sm">
              {usuarios.map((u) => (
                <option key={u.userId} value={u.userId}>
                  {u.name ?? u.email} ({u.email})
                </option>
              ))}
            </select>
          </div>
          {state.status === "error" && <p className="text-sm text-destructive">{state.error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Atribuindo..." : "Atribuir"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ReprogramarDialog({
  open,
  onOpenChange,
  workspaceId,
  projetoId,
  obraId,
  documentoIds,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  workspaceId: string;
  projetoId: string;
  obraId: string;
  documentoIds: string[];
  onSuccess: () => void;
}) {
  const [state, formAction, pending] = useActionState(bulkReprogramarAction, initialActionState);

  useEffect(() => {
    if (state.status === "success") {
      onOpenChange(false);
      onSuccess();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só dispara uma vez por submissão bem-sucedida;
    // incluir onOpenChange/onSuccess reintroduz o loop (a referência muda a cada render do pai).
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reprogramar</DialogTitle>
          <DialogDescription>Define a nova data prevista efetiva, mantendo a data prevista original como baseline.</DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="workspaceId" value={workspaceId} />
          <input type="hidden" name="projetoId" value={projetoId} />
          <input type="hidden" name="obraId" value={obraId} />
          {documentoIds.map((id) => (
            <input key={id} type="hidden" name="documentoIds" value={id} />
          ))}
          <div className="space-y-2">
            <Label htmlFor="dataReprogramada">Nova data</Label>
            <Input id="dataReprogramada" name="dataReprogramada" type="date" required />
          </div>
          {state.status === "error" && <p className="text-sm text-destructive">{state.error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Salvando..." : "Reprogramar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
