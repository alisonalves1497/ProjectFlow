"use client";

import { useActionState, useEffect, useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { updateMemberNameAction, type ActionState } from "./actions";

const initialActionState: ActionState = { status: "idle" };

export function EditMemberNameDialog({
  workspaceId,
  userId,
  nomeAtual,
}: {
  workspaceId: string;
  userId: string;
  nomeAtual: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(updateMemberNameAction, initialActionState);

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
            title="Editar nome"
            className="ml-1 size-4 shrink-0 text-muted-foreground/60 hover:text-primary"
          />
        }
      >
        <Pencil className="size-3" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar nome</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="workspaceId" value={workspaceId} />
          <input type="hidden" name="userId" value={userId} />
          <div className="space-y-2">
            <Label htmlFor="edit-member-name">Nome</Label>
            <Input id="edit-member-name" name="nome" type="text" defaultValue={nomeAtual} required />
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
