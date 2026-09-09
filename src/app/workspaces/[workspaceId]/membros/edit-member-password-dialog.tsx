"use client";

import { useActionState, useEffect, useState } from "react";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { updateMemberPasswordAction, type ActionState } from "./actions";

const initialActionState: ActionState = { status: "idle" };

export function EditMemberPasswordDialog({ workspaceId, userId, nome }: { workspaceId: string; userId: string; nome: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(updateMemberPasswordAction, initialActionState);

  useEffect(() => {
    if (state.status === "success") setOpen(false);
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            title="Definir nova senha"
            className="ml-1 size-4 shrink-0 text-muted-foreground/60 hover:text-primary"
          />
        }
      >
        <KeyRound className="size-3" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Definir nova senha</DialogTitle>
          <DialogDescription>
            Define a senha de {nome} diretamente — use enquanto o envio de link por email não estiver disponível. Repasse a senha pra
            pessoa por fora do sistema.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="workspaceId" value={workspaceId} />
          <input type="hidden" name="userId" value={userId} />
          <div className="space-y-2">
            <Label htmlFor="edit-member-senha">Nova senha</Label>
            <PasswordInput id="edit-member-senha" name="senha" minLength={6} required autoComplete="new-password" />
          </div>
          {state.status === "error" && <p className="text-sm text-destructive">{state.error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
