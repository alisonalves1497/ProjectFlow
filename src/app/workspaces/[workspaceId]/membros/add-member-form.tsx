"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addMemberAction, type ActionState } from "./actions";
import { WORKSPACE_ROLE_LABELS } from "@/lib/roles";

const initialActionState: ActionState = { status: "idle" };

export function AddMemberForm({ workspaceId }: { workspaceId: string }) {
  const [state, formAction, pending] = useActionState(addMemberAction, initialActionState);
  const [pessoaNova, setPessoaNova] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
      setPessoaNova(false);
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-2">
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <div className="flex items-start gap-2">
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
          <UserPlus className="size-4" />
          {pending ? "Adicionando..." : "Adicionar"}
        </Button>
      </div>

      <label className="flex items-center gap-2 text-xs text-muted-foreground">
        <input type="checkbox" className="checkbox-custom" checked={pessoaNova} onChange={(e) => setPessoaNova(e.target.checked)} />
        Essa pessoa ainda não tem conta no sistema
      </label>

      {pessoaNova && (
        <div className="grid grid-cols-2 gap-2 rounded-md border bg-muted/40 p-3">
          <div>
            <Input name="nome" placeholder="Nome da pessoa" required={pessoaNova} />
          </div>
          <div>
            <Input name="senha" type="text" placeholder="Senha provisória (mín. 6 caracteres)" required={pessoaNova} minLength={6} />
          </div>
          <p className="col-span-2 text-xs text-muted-foreground">
            A conta é criada com essa senha — você precisa repassar ela pra pessoa por fora do sistema (não tem convite por
            email nem troca de senha pelo próprio usuário ainda).
          </p>
        </div>
      )}
    </form>
  );
}
