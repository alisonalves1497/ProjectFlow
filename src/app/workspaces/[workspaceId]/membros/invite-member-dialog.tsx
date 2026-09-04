"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ALL_WORKSPACE_ROLES, WORKSPACE_ROLE_LABELS } from "@/lib/roles";
import { addMemberAction, type ActionState } from "./actions";

const initialState: ActionState = { status: "idle" };

export function InviteMemberDialog({
  workspaceId,
  open,
  onOpenChange,
}: {
  workspaceId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [state, formAction, pending] = useActionState(addMemberAction, initialState);
  const [pessoaNova, setPessoaNova] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
      setPessoaNova(false);
      onOpenChange(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só dispara uma vez por submissão bem-sucedida
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar membro</DialogTitle>
          <DialogDescription>Ainda não tem convite por email — a pessoa entra direto com um email e senha provisória.</DialogDescription>
        </DialogHeader>
        <form ref={formRef} action={formAction} className="space-y-4">
          <input type="hidden" name="workspaceId" value={workspaceId} />

          <div className="space-y-2">
            <Label htmlFor="invite-email">Email</Label>
            <Input id="invite-email" name="email" type="email" placeholder="email@empresa.com" required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="invite-role">Papel</Label>
            <select
              id="invite-role"
              name="role"
              defaultValue="analista"
              className="h-9 w-full rounded-md border bg-transparent px-3 text-sm"
            >
              {ALL_WORKSPACE_ROLES.map((r) => (
                <option key={r} value={r}>
                  {WORKSPACE_ROLE_LABELS[r]}
                </option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input type="checkbox" className="checkbox-custom" checked={pessoaNova} onChange={(e) => setPessoaNova(e.target.checked)} />
            Essa pessoa ainda não tem conta no sistema
          </label>

          {pessoaNova && (
            <div className="grid grid-cols-2 gap-2 rounded-md border bg-muted/40 p-3">
              <Input name="nome" placeholder="Nome da pessoa" required={pessoaNova} />
              <Input name="senha" type="text" placeholder="Senha provisória (mín. 6 caracteres)" required={pessoaNova} minLength={6} />
              <p className="col-span-2 text-xs text-muted-foreground">
                A conta é criada com essa senha — você precisa repassar ela pra pessoa por fora do sistema.
              </p>
            </div>
          )}

          {state.status === "error" && <p className="text-sm text-destructive">{state.error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Adicionando..." : "Adicionar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
