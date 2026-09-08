"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { addChatMensagemAction, type ActionState } from "../actions";

const initialActionState: ActionState = { status: "idle" };

type Mensagem = { id: string; corpo: string; createdAt: Date; autorNome: string | null };

export function ChatTab({ workspaceId, documentoId, mensagens }: { workspaceId: string; documentoId: string; mensagens: Mensagem[] }) {
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
            <li key={m.id} className="rounded-md border px-3 py-2 text-sm">
              <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{m.autorNome ?? "—"}</span>
                <span>{new Date(m.createdAt).toLocaleString("pt-BR")}</span>
              </div>
              <p className="whitespace-pre-wrap">{m.corpo}</p>
            </li>
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
