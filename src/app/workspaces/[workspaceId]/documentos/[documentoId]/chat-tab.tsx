"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  addChatMensagemAction,
  updateChatMensagemAction,
  deleteChatMensagemAction,
  type ActionState,
} from "../actions";

const initialActionState: ActionState = { status: "idle" };

export type MembroMencionavel = { userId: string; name: string };

// Destaca "@Nome" das pessoas citadas (casando os nomes conhecidos, mais compridos
// primeiro) — o resto do texto fica como veio.
function CorpoComMencoes({ corpo, membros }: { corpo: string; membros: MembroMencionavel[] }) {
  const nomes = membros.map((m) => m.name).filter(Boolean).sort((a, b) => b.length - a.length);
  if (nomes.length === 0 || !corpo.includes("@")) return <>{corpo}</>;
  const escapar = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`(@(?:${nomes.map(escapar).join("|")}))(?![\\p{L}\\p{N}_])`, "giu");
  return (
    <>
      {corpo.split(re).map((parte, i) =>
        i % 2 === 1 ? (
          <span key={i} className="rounded bg-primary/10 px-0.5 font-medium text-primary">
            {parte}
          </span>
        ) : (
          parte
        )
      )}
    </>
  );
}

// Textarea que abre a lista de pessoas ao digitar "@" e insere "@Nome Completo " ao
// escolher — o servidor reconhece a menção pelo nome exato (ver registrarMencoes).
function TextareaComMencao({
  name,
  membros,
  value,
  onChange,
  placeholder,
  required,
  defaultValue,
}: {
  name: string;
  membros: MembroMencionavel[];
  value?: string;
  onChange?: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  defaultValue?: string;
}) {
  const [texto, setTexto] = useState(value ?? defaultValue ?? "");
  const [sugestoes, setSugestoes] = useState<MembroMencionavel[]>([]);
  const [gatilho, setGatilho] = useState<{ inicio: number; fim: number } | null>(null);
  const ref = useRef<HTMLTextAreaElement>(null);

  function atualizar(novo: string, cursor: number) {
    setTexto(novo);
    onChange?.(novo);
    const m = /(^|\s)@([^\s@]*)$/.exec(novo.slice(0, cursor));
    if (!m) {
      setGatilho(null);
      setSugestoes([]);
      return;
    }
    const termo = m[2].toLowerCase();
    setGatilho({ inicio: cursor - m[2].length - 1, fim: cursor });
    setSugestoes(membros.filter((x) => x.name.toLowerCase().includes(termo)).slice(0, 6));
  }

  function escolher(m: MembroMencionavel) {
    if (!gatilho) return;
    const novo = `${texto.slice(0, gatilho.inicio)}@${m.name} ${texto.slice(gatilho.fim)}`;
    const cursor = gatilho.inicio + m.name.length + 2;
    setTexto(novo);
    onChange?.(novo);
    setGatilho(null);
    setSugestoes([]);
    requestAnimationFrame(() => {
      ref.current?.focus();
      ref.current?.setSelectionRange(cursor, cursor);
    });
  }

  return (
    <div className="relative">
      <Textarea
        ref={ref}
        name={name}
        value={texto}
        placeholder={placeholder}
        required={required}
        onChange={(e) => atualizar(e.target.value, e.target.selectionStart)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setGatilho(null);
            setSugestoes([]);
          }
        }}
      />
      {sugestoes.length > 0 && (
        <ul className="absolute right-0 left-0 z-20 mt-1 max-h-48 overflow-auto rounded-md border bg-popover p-1 shadow-md">
          {sugestoes.map((m) => (
            <li key={m.userId}>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  escolher(m);
                }}
                className="block w-full rounded px-2 py-1.5 text-left text-sm hover:bg-accent"
              >
                {m.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

type Mensagem = {
  id: string;
  corpo: string;
  createdAt: Date;
  editedAt: Date | null;
  autorId: string;
  autorNome: string | null;
};

function MensagemItem({
  workspaceId,
  documentoId,
  mensagem,
  podeEditar,
  podeExcluir,
  membros,
}: {
  workspaceId: string;
  documentoId: string;
  mensagem: Mensagem;
  podeEditar: boolean;
  podeExcluir: boolean;
  membros: MembroMencionavel[];
}) {
  const [editando, setEditando] = useState(false);
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);
  const [editState, editAction, editPending] = useActionState(updateChatMensagemAction, initialActionState);
  const [deleteState, deleteAction, deletePending] = useActionState(deleteChatMensagemAction, initialActionState);

  useEffect(() => {
    if (editState.status === "error") toast.error(editState.error);
    if (editState.status === "success") setEditando(false);
  }, [editState]);

  useEffect(() => {
    if (deleteState.status === "error") toast.error(deleteState.error);
  }, [deleteState]);

  return (
    <li className="rounded-md border px-3 py-2 text-sm">
      <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
        <span className="font-medium text-foreground">{mensagem.autorNome ?? "—"}</span>
        <span>
          {new Date(mensagem.createdAt).toLocaleString("pt-BR")}
          {mensagem.editedAt && <span className="ml-1 italic">(editado)</span>}
        </span>
      </div>

      {editando ? (
        <form action={editAction} className="space-y-2">
          <input type="hidden" name="workspaceId" value={workspaceId} />
          <input type="hidden" name="documentoId" value={documentoId} />
          <input type="hidden" name="mensagemId" value={mensagem.id} />
          <TextareaComMencao name="corpo" membros={membros} defaultValue={mensagem.corpo} required />
          <div className="flex justify-end gap-2">
            <Button type="button" size="sm" variant="ghost" onClick={() => setEditando(false)} disabled={editPending}>
              Cancelar
            </Button>
            <Button type="submit" size="sm" disabled={editPending}>
              {editPending ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      ) : (
        <>
          <p className="whitespace-pre-wrap">
            <CorpoComMencoes corpo={mensagem.corpo} membros={membros} />
          </p>
          {(podeEditar || podeExcluir) && (
            <div className="mt-1.5 flex items-center gap-3 text-xs">
              {podeEditar && (
                <button
                  type="button"
                  onClick={() => setEditando(true)}
                  className="text-muted-foreground hover:text-foreground hover:underline"
                >
                  Editar
                </button>
              )}
              {podeExcluir &&
                (confirmandoExclusao ? (
                  <form action={deleteAction} className="inline-flex items-center gap-2">
                    <input type="hidden" name="workspaceId" value={workspaceId} />
                    <input type="hidden" name="documentoId" value={documentoId} />
                    <input type="hidden" name="mensagemId" value={mensagem.id} />
                    <span className="text-muted-foreground">Excluir?</span>
                    <button type="submit" disabled={deletePending} className="text-destructive hover:underline">
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
                  <button
                    type="button"
                    onClick={() => setConfirmandoExclusao(true)}
                    className="text-muted-foreground hover:text-destructive hover:underline"
                  >
                    Excluir
                  </button>
                ))}
            </div>
          )}
        </>
      )}
    </li>
  );
}

export function ChatTab({
  workspaceId,
  documentoId,
  mensagens,
  usuarioId,
  podeExcluir,
  membros,
}: {
  workspaceId: string;
  documentoId: string;
  mensagens: Mensagem[];
  usuarioId: string;
  podeExcluir: boolean;
  membros: MembroMencionavel[];
}) {
  const [state, formAction, pending] = useActionState(addChatMensagemAction, initialActionState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === "error") toast.error(state.error);
    if (state.status === "success") formRef.current?.reset();
  }, [state]);

  return (
    <div className="space-y-4">
      {mensagens.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma observação registrada ainda.</p>
      ) : (
        <ul className="space-y-2">
          {mensagens.map((m) => (
            <MensagemItem
              key={m.id}
              workspaceId={workspaceId}
              documentoId={documentoId}
              mensagem={m}
              podeEditar={m.autorId === usuarioId}
              podeExcluir={podeExcluir}
              membros={membros}
            />
          ))}
        </ul>
      )}

      <form ref={formRef} action={formAction} className="space-y-2">
        <input type="hidden" name="workspaceId" value={workspaceId} />
        <input type="hidden" name="documentoId" value={documentoId} />
        <TextareaComMencao key={mensagens.length} name="corpo" membros={membros} placeholder="Escreva uma observação ou anotação... (use @ para citar alguém)" required />
        <div className="flex justify-end">
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? "Enviando..." : "Enviar"}
          </Button>
        </div>
      </form>
    </div>
  );
}
