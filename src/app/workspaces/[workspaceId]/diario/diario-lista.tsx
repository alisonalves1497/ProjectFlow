"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { Pencil, Trash2, FileText, X, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  criarEntradaDiarioAction,
  atualizarEntradaDiarioAction,
  excluirEntradaDiarioAction,
  buscarDocumentosParaDiarioAction,
  type ActionState,
} from "./actions";
import type { EntradaDiario } from "@/services/diarioService";

const initialActionState: ActionState = { status: "idle" };

function hojeISO(): string {
  return new Date().toISOString().slice(0, 10);
}

// "Hoje"/"Ontem" só quando bate exatamente — qualquer outro dia mostra por extenso, pra não
// ter que ficar fazendo conta de cabeça pra saber que dia da semana foi.
function rotuloData(iso: string): string {
  const hoje = hojeISO();
  const ontem = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  if (iso === hoje) return "Hoje";
  if (iso === ontem) return "Ontem";
  const rotulo = new Date(iso + "T00:00:00").toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  return rotulo.charAt(0).toUpperCase() + rotulo.slice(1);
}

type DocumentoRef = { id: string; rotulo: string } | null;

// Combobox simples de busca de documento (opcional) — chama a server action direto (sem
// useActionState, não é um submit de formulário) com debounce enquanto a pessoa digita.
function DocumentoBuscador({
  workspaceId,
  valor,
  onSelect,
  onClear,
}: {
  workspaceId: string;
  valor: DocumentoRef;
  onSelect: (ref: DocumentoRef) => void;
  onClear: () => void;
}) {
  const [termo, setTermo] = useState("");
  const [resultados, setResultados] = useState<{ id: string; codigoCompleto: string; descricao: string }[]>([]);
  const [aberto, setAberto] = useState(false);

  useEffect(() => {
    if (termo.trim().length < 2) {
      setResultados([]);
      return;
    }
    const t = setTimeout(async () => {
      const docs = await buscarDocumentosParaDiarioAction(workspaceId, termo);
      setResultados(docs);
    }, 250);
    return () => clearTimeout(t);
  }, [termo, workspaceId]);

  if (valor) {
    return (
      <span className="inline-flex max-w-full items-center gap-1 rounded-full border bg-muted px-2 py-0.5 text-xs">
        <FileText className="size-3 shrink-0" />
        <span className="truncate">{valor.rotulo}</span>
        <button type="button" onClick={onClear} className="shrink-0 text-muted-foreground hover:text-foreground">
          <X className="size-3" />
        </button>
      </span>
    );
  }

  return (
    <div className="relative">
      <input
        type="text"
        value={termo}
        onChange={(e) => {
          setTermo(e.target.value);
          setAberto(true);
        }}
        onFocus={() => setAberto(true)}
        onBlur={() => setTimeout(() => setAberto(false), 150)}
        placeholder="Vincular um documento (opcional)..."
        className="h-8 w-full max-w-72 rounded-md border bg-transparent px-2 text-xs"
      />
      {aberto && resultados.length > 0 && (
        <div className="absolute z-10 mt-1 w-80 max-w-[calc(100vw-2rem)] rounded-md border bg-popover p-1 shadow-md">
          {resultados.map((d) => (
            <button
              key={d.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onSelect({ id: d.id, rotulo: `${d.codigoCompleto} — ${d.descricao}` });
                setTermo("");
                setResultados([]);
                setAberto(false);
              }}
              className="block w-full truncate rounded px-2 py-1 text-left text-xs hover:bg-accent"
            >
              <span className="font-mono">{d.codigoCompleto}</span> <span className="text-muted-foreground">{d.descricao}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function NovoRegistroForm({ workspaceId }: { workspaceId: string }) {
  const [state, formAction, pending] = useActionState(criarEntradaDiarioAction, initialActionState);
  const [texto, setTexto] = useState("");
  const [data, setData] = useState(hojeISO());
  const [documento, setDocumento] = useState<DocumentoRef>(null);

  useEffect(() => {
    if (state.status === "success") {
      setTexto("");
      setDocumento(null);
      // data fica como estava — comum registrar várias coisas seguidas do mesmo dia.
      toast.success("Registrado.");
    }
    if (state.status === "error") toast.error(state.error);
  }, [state]);

  return (
    <form action={formAction} className="mb-8 rounded-lg border p-4">
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <input type="hidden" name="documentoId" value={documento?.id ?? ""} />
      <Textarea
        name="texto"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder="O que você fez? Ex: entreguei o documento X, ensinei o estagiário sobre Y..."
        rows={3}
        required
        className="mb-3"
      />
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="date"
          name="data"
          value={data}
          max={hojeISO()}
          onChange={(e) => setData(e.target.value)}
          className="h-8 rounded-md border bg-transparent px-2 text-xs"
        />
        <DocumentoBuscador
          workspaceId={workspaceId}
          valor={documento}
          onSelect={setDocumento}
          onClear={() => setDocumento(null)}
        />
        <Button type="submit" size="sm" disabled={pending || !texto.trim()} className="ml-auto">
          {pending ? "Salvando..." : "Registrar"}
        </Button>
      </div>
    </form>
  );
}

function EntradaItem({ workspaceId, entrada }: { workspaceId: string; entrada: EntradaDiario }) {
  const [editando, setEditando] = useState(false);
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);
  const [texto, setTexto] = useState(entrada.texto);
  const [documento, setDocumento] = useState<DocumentoRef>(
    entrada.documentoId && entrada.documentoCodigo
      ? { id: entrada.documentoId, rotulo: `${entrada.documentoCodigo} — ${entrada.documentoDescricao ?? ""}` }
      : null
  );
  const [editState, editAction, editPending] = useActionState(atualizarEntradaDiarioAction, initialActionState);
  const [deleteState, deleteAction, deletePending] = useActionState(excluirEntradaDiarioAction, initialActionState);

  useEffect(() => {
    if (editState.status === "success") {
      setEditando(false);
      toast.success("Atualizado.");
    }
    if (editState.status === "error") toast.error(editState.error);
  }, [editState]);

  useEffect(() => {
    if (deleteState.status === "error") toast.error(deleteState.error);
  }, [deleteState]);

  const hora = new Date(entrada.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  if (editando) {
    return (
      <li className="rounded-md border p-3">
        <form action={editAction} className="space-y-2">
          <input type="hidden" name="workspaceId" value={workspaceId} />
          <input type="hidden" name="entradaId" value={entrada.id} />
          <input type="hidden" name="documentoId" value={documento?.id ?? ""} />
          <Textarea name="texto" value={texto} onChange={(e) => setTexto(e.target.value)} rows={3} required />
          <div className="flex flex-wrap items-center gap-2">
            <DocumentoBuscador
              workspaceId={workspaceId}
              valor={documento}
              onSelect={setDocumento}
              onClear={() => setDocumento(null)}
            />
            <div className="ml-auto flex gap-2">
              <Button type="button" size="sm" variant="ghost" disabled={editPending} onClick={() => setEditando(false)}>
                Cancelar
              </Button>
              <Button type="submit" size="sm" disabled={editPending}>
                {editPending ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className="group/entrada rounded-md border p-3 text-sm">
      <p className="whitespace-pre-wrap">{entrada.texto}</p>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">{hora}</span>
          {entrada.documentoId && entrada.documentoCodigo && (
            <Link
              href={`/workspaces/${workspaceId}/documentos/${entrada.documentoId}`}
              className="inline-flex items-center gap-1 rounded-full border bg-muted px-2 py-0.5 text-xs hover:bg-accent"
            >
              <FileText className="size-3" />
              {entrada.documentoCodigo}
            </Link>
          )}
        </div>
        <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover/entrada:opacity-100">
          {confirmandoExclusao ? (
            <form action={deleteAction} className="flex items-center gap-1.5 text-xs">
              <input type="hidden" name="workspaceId" value={workspaceId} />
              <input type="hidden" name="entradaId" value={entrada.id} />
              <span className="text-muted-foreground">Excluir?</span>
              <button type="submit" disabled={deletePending} className="font-medium text-destructive hover:underline">
                {deletePending ? "Excluindo..." : "Sim"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmandoExclusao(false)}
                className="text-muted-foreground hover:text-foreground hover:underline"
              >
                Não
              </button>
            </form>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setEditando(true)}
                title="Editar"
                className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <Pencil className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setConfirmandoExclusao(true)}
                title="Excluir"
                className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-destructive"
              >
                <Trash2 className="size-3.5" />
              </button>
            </>
          )}
        </div>
      </div>
    </li>
  );
}

export function DiarioLista({ workspaceId, entradasIniciais }: { workspaceId: string; entradasIniciais: EntradaDiario[] }) {
  // Agrupado por data — já vem ordenado (data desc, createdAt desc) do serviço.
  const grupos: { data: string; entradas: EntradaDiario[] }[] = [];
  for (const e of entradasIniciais) {
    const grupo = grupos[grupos.length - 1];
    if (grupo && grupo.data === e.data) grupo.entradas.push(e);
    else grupos.push({ data: e.data, entradas: [e] });
  }

  return (
    <div>
      <NovoRegistroForm workspaceId={workspaceId} />

      {grupos.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">
          <BookOpen className="size-6" />
          Nenhum registro ainda. Comece anotando o que você fez hoje.
        </div>
      ) : (
        <div className="space-y-6">
          {grupos.map((g) => (
            <div key={g.data}>
              <h2 className="mb-2 text-sm font-semibold text-muted-foreground">{rotuloData(g.data)}</h2>
              <ul className="space-y-2">
                {g.entradas.map((e) => (
                  <EntradaItem key={e.id} workspaceId={workspaceId} entrada={e} />
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
