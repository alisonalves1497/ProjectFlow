"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { trocarCopiaControladaAction, cancelarCopiaControladaAction, type ActionState } from "./actions";

const initialActionState: ActionState = { status: "idle" };

function ActionForm({
  action,
  workspaceId,
  projetoId,
  obraId,
  copiaId,
  label,
  pendingLabel,
  variant,
}: {
  action: typeof trocarCopiaControladaAction;
  workspaceId: string;
  projetoId: string;
  obraId: string;
  copiaId: string;
  label: string;
  pendingLabel: string;
  variant: "outline" | "ghost";
}) {
  const [state, formAction, pending] = useActionState(action, initialActionState);

  useEffect(() => {
    if (state.status === "error") toast.error(state.error);
  }, [state]);

  return (
    <form action={formAction}>
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <input type="hidden" name="projetoId" value={projetoId} />
      <input type="hidden" name="obraId" value={obraId} />
      <input type="hidden" name="copiaId" value={copiaId} />
      <Button type="submit" variant={variant} size="sm" disabled={pending}>
        {pending ? pendingLabel : label}
      </Button>
    </form>
  );
}

export function TrocarCopiaButton(props: { workspaceId: string; projetoId: string; obraId: string; copiaId: string }) {
  return <ActionForm action={trocarCopiaControladaAction} {...props} label="Trocar" pendingLabel="Trocando..." variant="outline" />;
}

export function CancelarCopiaButton(props: { workspaceId: string; projetoId: string; obraId: string; copiaId: string }) {
  return <ActionForm action={cancelarCopiaControladaAction} {...props} label="Cancelar" pendingLabel="Cancelando..." variant="ghost" />;
}
