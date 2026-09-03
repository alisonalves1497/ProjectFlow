"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { toggleObraAccessAction, type ActionState } from "./actions";

type Obra = { id: string; name: string; code: string; projetoId: string; projetoNome: string };

const initialActionState: ActionState = { status: "idle" };

function ObraCheckbox({
  workspaceId,
  targetUserId,
  obraId,
  checked,
  disabled,
}: {
  workspaceId: string;
  targetUserId: string;
  obraId: string;
  checked: boolean;
  disabled: boolean;
}) {
  const [state, formAction] = useActionState(toggleObraAccessAction, initialActionState);

  useEffect(() => {
    if (state.status === "error") toast.error(state.error);
  }, [state]);

  return (
    <form action={formAction}>
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <input type="hidden" name="targetUserId" value={targetUserId} />
      <input type="hidden" name="obraId" value={obraId} />
      <input type="hidden" name="grant" value={checked ? "0" : "1"} />
      <input
        type="checkbox"
        className="checkbox-custom"
        checked={checked}
        disabled={disabled}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
      />
    </form>
  );
}

export function MemberObraAccess({
  workspaceId,
  targetUserId,
  obras,
  obraIdsComAcesso,
  canManage,
}: {
  workspaceId: string;
  targetUserId: string;
  obras: Obra[];
  obraIdsComAcesso: Set<string>;
  canManage: boolean;
}) {
  const [aberto, setAberto] = useState(false);

  const porProjeto = useMemo(() => {
    const grupos = new Map<string, { projetoNome: string; obras: Obra[] }>();
    for (const o of obras) {
      if (!grupos.has(o.projetoId)) grupos.set(o.projetoId, { projetoNome: o.projetoNome, obras: [] });
      grupos.get(o.projetoId)!.obras.push(o);
    }
    return [...grupos.values()];
  }, [obras]);

  return (
    <div>
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        <ChevronDown className={cn("size-3.5 transition-transform", aberto && "rotate-180")} />
        Acesso a Obras ({obraIdsComAcesso.size} de {obras.length})
      </button>

      {aberto && (
        <div className="mt-2 max-h-64 space-y-3 overflow-y-auto rounded-md border p-3">
          {porProjeto.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma obra neste workspace ainda.</p>}
          {porProjeto.map((grupo) => (
            <div key={grupo.projetoNome}>
              <p className="mb-1 text-[0.65rem] font-semibold tracking-wide text-muted-foreground uppercase">
                {grupo.projetoNome}
              </p>
              <div className="space-y-1">
                {grupo.obras.map((o) => (
                  <label key={o.id} className="flex items-center gap-2 text-sm">
                    <ObraCheckbox
                      workspaceId={workspaceId}
                      targetUserId={targetUserId}
                      obraId={o.id}
                      checked={obraIdsComAcesso.has(o.id)}
                      disabled={!canManage}
                    />
                    {o.name} <span className="text-xs text-muted-foreground">({o.code})</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
