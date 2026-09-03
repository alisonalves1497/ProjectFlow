"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { removeObraMemberAction, type ActionState } from "../actions";

const initialActionState: ActionState = { status: "idle" };

export function RemoveObraMemberButton({
  workspaceId,
  projetoId,
  obraId,
  userId,
}: {
  workspaceId: string;
  projetoId: string;
  obraId: string;
  userId: string;
}) {
  const [state, formAction, pending] = useActionState(removeObraMemberAction, initialActionState);

  useEffect(() => {
    if (state.status === "error") toast.error(state.error);
  }, [state]);

  return (
    <form action={formAction}>
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <input type="hidden" name="projetoId" value={projetoId} />
      <input type="hidden" name="obraId" value={obraId} />
      <input type="hidden" name="userId" value={userId} />
      <Button type="submit" variant="ghost" size="sm" disabled={pending}>
        {pending ? "Removendo..." : "Remover"}
      </Button>
    </form>
  );
}
