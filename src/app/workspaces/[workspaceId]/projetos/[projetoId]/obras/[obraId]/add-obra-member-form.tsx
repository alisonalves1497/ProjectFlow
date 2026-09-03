"use client";

import { useActionState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addObraMemberAction, type ActionState } from "../actions";

const initialActionState: ActionState = { status: "idle" };

export function AddObraMemberForm({ workspaceId, projetoId, obraId }: { workspaceId: string; projetoId: string; obraId: string }) {
  const [state, formAction, pending] = useActionState(addObraMemberAction, initialActionState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === "success") formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="flex items-start gap-2">
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <input type="hidden" name="projetoId" value={projetoId} />
      <input type="hidden" name="obraId" value={obraId} />
      <div className="flex-1">
        <Input name="email" type="email" placeholder="email@empresa.com" required />
        {state.status === "error" && <p className="mt-1 text-sm text-destructive">{state.error}</p>}
      </div>
      <Button type="submit" disabled={pending} variant="secondary">
        {pending ? "Adicionando..." : "Adicionar"}
      </Button>
    </form>
  );
}
