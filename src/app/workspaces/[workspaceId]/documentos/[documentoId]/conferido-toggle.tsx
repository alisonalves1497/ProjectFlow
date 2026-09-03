"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { toggleConferidoAction, type ActionState } from "../actions";

const initialActionState: ActionState = { status: "idle" };

export function ConferidoToggle({
  workspaceId,
  documentoId,
  revisaoId,
  conferido,
  conferidoPorNome,
  conferidoEm,
}: {
  workspaceId: string;
  documentoId: string;
  revisaoId: string;
  conferido: boolean;
  conferidoPorNome: string | null;
  conferidoEm: Date | null;
}) {
  const [state, formAction, pending] = useActionState(toggleConferidoAction, initialActionState);

  useEffect(() => {
    if (state.status === "error") toast.error(state.error);
  }, [state]);

  return (
    <form action={formAction} className="flex items-center gap-2 text-sm">
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <input type="hidden" name="documentoId" value={documentoId} />
      <input type="hidden" name="revisaoId" value={revisaoId} />
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          className="checkbox-custom"
          checked={conferido}
          disabled={pending}
          onChange={(e) => e.currentTarget.form?.requestSubmit()}
        />
        Conferido
      </label>
      {conferido && conferidoEm && (
        <span className="text-xs text-muted-foreground">
          por {conferidoPorNome ?? "—"} em {new Date(conferidoEm).toLocaleString("pt-BR")}
        </span>
      )}
    </form>
  );
}
