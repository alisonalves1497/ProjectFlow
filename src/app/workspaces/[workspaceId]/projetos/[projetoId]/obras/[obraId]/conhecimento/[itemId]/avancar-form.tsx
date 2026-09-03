"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { STATUS_LABELS, type StatusItemConhecimento } from "@/lib/conhecimentoStatusGraph";
import { avancarStatusAction, type ActionState } from "../actions";

const initialActionState: ActionState = { status: "idle" };

export function AvancarForm({
  workspaceId,
  projetoId,
  obraId,
  itemId,
  proximoStatus,
}: {
  workspaceId: string;
  projetoId: string;
  obraId: string;
  itemId: string;
  proximoStatus: StatusItemConhecimento | null;
}) {
  const [state, formAction, pending] = useActionState(avancarStatusAction, initialActionState);

  useEffect(() => {
    if (state.status === "error") toast.error(state.error);
  }, [state]);

  if (!proximoStatus) {
    return <p className="text-sm text-muted-foreground">Item fechado — não há próximo status.</p>;
  }

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <input type="hidden" name="projetoId" value={projetoId} />
      <input type="hidden" name="obraId" value={obraId} />
      <input type="hidden" name="itemId" value={itemId} />

      {proximoStatus === "respondida" && <Textarea name="resposta" placeholder="Resposta" required />}
      {proximoStatus === "corrigida" && <Textarea name="acaoCorretiva" placeholder="Ação corretiva" required />}

      <Button type="submit" disabled={pending}>
        {pending ? "Avançando..." : `Avançar para "${STATUS_LABELS[proximoStatus]}"`}
      </Button>
    </form>
  );
}
