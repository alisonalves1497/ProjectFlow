"use client";

import { useActionState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addMemberAction, type ActionState } from "./actions";
import { WORKSPACE_ROLE_LABELS } from "@/lib/roles";

const initialActionState: ActionState = { status: "idle" };

export function AddMemberForm({ workspaceId }: { workspaceId: string }) {
  const [state, formAction, pending] = useActionState(addMemberAction, initialActionState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === "success") formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="flex items-start gap-2">
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <div className="flex-1">
        <Input name="email" type="email" placeholder="email@empresa.com" required />
        {state.status === "error" && <p className="mt-1 text-sm text-destructive">{state.error}</p>}
      </div>
      <select name="role" defaultValue="analista" className="h-9 rounded-md border bg-transparent px-3 text-sm">
        <option value="analista">{WORKSPACE_ROLE_LABELS.analista}</option>
        <option value="lider_aprovador">{WORKSPACE_ROLE_LABELS.lider_aprovador}</option>
        <option value="coordenador">{WORKSPACE_ROLE_LABELS.coordenador}</option>
        <option value="administrador">{WORKSPACE_ROLE_LABELS.administrador}</option>
      </select>
      <Button type="submit" disabled={pending} variant="secondary">
        {pending ? "Adicionando..." : "Adicionar"}
      </Button>
    </form>
  );
}
