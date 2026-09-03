"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { addComentarioAction, type ActionState } from "../actions";

const initialActionState: ActionState = { status: "idle" };

export function AddComentarioForm({ workspaceId, documentoId, revisaoId }: { workspaceId: string; documentoId: string; revisaoId: string }) {
  const [state, formAction, pending] = useActionState(addComentarioAction, initialActionState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === "error") toast.error(state.error);
    if (state.status === "success") formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-2">
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <input type="hidden" name="documentoId" value={documentoId} />
      <input type="hidden" name="revisaoId" value={revisaoId} />
      <Textarea name="corpo" placeholder="Escreva um comentário..." required />
      <div className="grid grid-cols-2 gap-2">
        <Input name="anexoNome" placeholder="Nome do anexo (opcional)" />
        <Input name="anexoUrl" type="url" placeholder="URL do anexo (opcional)" />
      </div>
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input type="checkbox" name="marcarPendenciaCliente" className="rounded border" />
          Marcar como pendência do cliente
        </label>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Enviando..." : "Comentar"}
        </Button>
      </div>
    </form>
  );
}
