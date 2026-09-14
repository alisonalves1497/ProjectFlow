"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { purgeProjetoAction, purgeObraAction, type ActionState } from "./actions";

const initialActionState: ActionState = { status: "idle" };

// Só aparece pra administrador (a página decide isso) — exclusão definitiva não tem volta,
// diferente do botão "Restaurar" ao lado, então pede uma confirmação extra em duas etapas
// (mesmo padrão já usado no chat do documento) em vez de agir no primeiro clique.
export function PurgeButton({
  kind,
  workspaceId,
  projetoId,
  obraId,
  nome,
}: {
  kind: "projeto" | "obra";
  workspaceId: string;
  projetoId: string;
  obraId?: string;
  nome: string;
}) {
  const action = kind === "projeto" ? purgeProjetoAction : purgeObraAction;
  const [state, formAction, pending] = useActionState(action, initialActionState);
  const [confirmando, setConfirmando] = useState(false);

  useEffect(() => {
    if (state.status === "error") toast.error(state.error);
    if (state.status === "success") toast.success(`"${nome}" excluído definitivamente.`);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só dispara uma vez por submissão bem-sucedida
  }, [state]);

  if (confirmando) {
    return (
      <form action={formAction} className="flex items-center gap-1.5 text-xs">
        <input type="hidden" name="workspaceId" value={workspaceId} />
        <input type="hidden" name="projetoId" value={projetoId} />
        {obraId && <input type="hidden" name="obraId" value={obraId} />}
        <span className="text-muted-foreground">Apagar de vez, sem volta?</span>
        <button type="submit" disabled={pending} className="font-medium text-destructive hover:underline">
          {pending ? "Excluindo..." : "Sim, apagar"}
        </button>
        <button
          type="button"
          onClick={() => setConfirmando(false)}
          disabled={pending}
          className="text-muted-foreground hover:text-foreground hover:underline"
        >
          Cancelar
        </button>
      </form>
    );
  }

  return (
    <Button type="button" variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => setConfirmando(true)}>
      <Trash2 className="size-3.5" />
      Excluir definitivamente
    </Button>
  );
}
