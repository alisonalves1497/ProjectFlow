"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { responderGrdAction, type ActionState } from "../actions";

const initialActionState: ActionState = { status: "idle" };

export function ResponderGrdForm({ workspaceId, grdId }: { workspaceId: string; grdId: string }) {
  const [state, formAction, pending] = useActionState(responderGrdAction, initialActionState);

  useEffect(() => {
    if (state.status === "error") toast.error(state.error);
  }, [state]);

  return (
    <form action={formAction} className="space-y-2 rounded-md border p-3">
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <input type="hidden" name="grdId" value={grdId} />
      <div className="space-y-1">
        <Label htmlFor="arquivoRespostaUrl">URL do arquivo de resposta</Label>
        <Input id="arquivoRespostaUrl" name="arquivoRespostaUrl" type="url" required placeholder="https://..." />
      </div>
      <div className="space-y-1">
        <Label htmlFor="arquivoRespostaNome">Nome do arquivo (opcional)</Label>
        <Input id="arquivoRespostaNome" name="arquivoRespostaNome" />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Enviando..." : "Marcar como respondido"}
      </Button>
    </form>
  );
}
