"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { restoreProjetoAction, restoreObraAction, type ActionState } from "./actions";

const initialActionState: ActionState = { status: "idle" };

export function RestoreButton({
  kind,
  workspaceId,
  projetoId,
  obraId,
}: {
  kind: "projeto" | "obra";
  workspaceId: string;
  projetoId: string;
  obraId?: string;
}) {
  const action = kind === "projeto" ? restoreProjetoAction : restoreObraAction;
  const [state, formAction, pending] = useActionState(action, initialActionState);

  useEffect(() => {
    if (state.status === "error") toast.error(state.error);
    if (state.status === "success") toast.success("Restaurado.");
  }, [state]);

  return (
    <form action={formAction}>
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <input type="hidden" name="projetoId" value={projetoId} />
      {obraId && <input type="hidden" name="obraId" value={obraId} />}
      <Button type="submit" variant="outline" size="sm" disabled={pending}>
        <RotateCcw className="size-3.5" />
        {pending ? "Restaurando..." : "Restaurar"}
      </Button>
    </form>
  );
}
