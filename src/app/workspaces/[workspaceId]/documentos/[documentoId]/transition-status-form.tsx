"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { STATUS_LABELS, type StatusDocumento } from "@/lib/statusGraph";
import { transitionStatusAction, type ActionState } from "../actions";

const initialActionState: ActionState = { status: "idle" };

export function TransitionStatusForm({
  workspaceId,
  documentoId,
  revisaoId,
  validNextStatuses,
}: {
  workspaceId: string;
  documentoId: string;
  revisaoId: string;
  validNextStatuses: StatusDocumento[];
}) {
  const [state, formAction, pending] = useActionState(transitionStatusAction, initialActionState);

  useEffect(() => {
    if (state.status === "error") toast.error(state.error);
  }, [state]);

  if (validNextStatuses.length === 0) return null;

  return (
    <form action={formAction} className="flex flex-wrap gap-2">
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <input type="hidden" name="documentoId" value={documentoId} />
      <input type="hidden" name="revisaoId" value={revisaoId} />
      {validNextStatuses.map((s) => (
        <Button key={s} type="submit" name="novoStatus" value={s} variant={s === "cancelado" ? "destructive" : "outline"} disabled={pending}>
          {STATUS_LABELS[s]}
        </Button>
      ))}
    </form>
  );
}
