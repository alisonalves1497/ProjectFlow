"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cancelarGrdAction, type ActionState } from "../actions";

const initialActionState: ActionState = { status: "idle" };

export function CancelarGrdButton({ workspaceId, grdId }: { workspaceId: string; grdId: string }) {
  const [state, formAction, pending] = useActionState(cancelarGrdAction, initialActionState);

  useEffect(() => {
    if (state.status === "error") toast.error(state.error);
  }, [state]);

  return (
    <form action={formAction}>
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <input type="hidden" name="grdId" value={grdId} />
      <Button type="submit" variant="destructive" disabled={pending}>
        {pending ? "Cancelando..." : "Cancelar GRD"}
      </Button>
    </form>
  );
}
