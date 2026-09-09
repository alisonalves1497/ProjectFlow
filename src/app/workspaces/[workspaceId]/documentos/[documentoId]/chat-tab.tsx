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
}: {
  workspaceId: string;
  documentoId: string;
  mensagem: Mensagem;
  podeEditar: boolean;
  podeExcluir: boolean;
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
          <Textarea name="corpo" defaultValue={mensagem.corpo} required />
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
          <p className="whitespace-pre-wrap">{mensagem.corpo}</p>
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
}: {
  workspaceId: string;
  documentoId: string;
  mensagens: Mensagem[];
  usuarioId: string;
  podeExcluir: boolean;
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
            />
          ))}
        </ul>
      )}

      <form ref={formRef} action={formAction} className="space-y-2">
        <input type="hidden" name="workspaceId" value={workspaceId} />
        <input type="hidden" name="documentoId" value={documentoId} />
        <Textarea name="corpo" placeholder="Escreva uma observação ou anotação..." required />
        <div className="flex justify-end">
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? "Enviando..." : "Enviar"}
          </Button>
        </div>
      </form>
    </div>
  );
}
