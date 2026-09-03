"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { marcarCompradoAction, desmarcarCompradoAction, type ActionState } from "../actions";

const initialActionState: ActionState = { status: "idle" };

export function MarcarCompradoButton({
  workspaceId,
  projetoId,
  obraId,
  itemId,
  comprado,
}: {
  workspaceId: string;
  projetoId: string;
  obraId: string;
  itemId: string;
  comprado: boolean;
}) {
  const action = comprado ? desmarcarCompradoAction : marcarCompradoAction;
  const [state, formAction, pending] = useActionState(action, initialActionState);

  useEffect(() => {
    if (state.status === "error") toast.error(state.error);
  }, [state]);

  return (
    <form action={formAction}>
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <input type="hidden" name="projetoId" value={projetoId} />
      <input type="hidden" name="obraId" value={obraId} />
      <input type="hidden" name="itemId" value={itemId} />
      <Button type="submit" variant={comprado ? "ghost" : "outline"} size="sm" disabled={pending}>
        {pending ? "..." : comprado ? "Desmarcar" : "Marcar comprado"}
      </Button>
    </form>
  );
}
