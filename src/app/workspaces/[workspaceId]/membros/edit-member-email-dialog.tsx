"use client";

import { useActionState, useEffect, useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { updateMemberEmailAction, type ActionState } from "./actions";

const initialActionState: ActionState = { status: "idle" };

export function EditMemberEmailDialog({
  workspaceId,
  userId,
  emailAtual,
}: {
  workspaceId: string;
  userId: string;
  emailAtual: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(updateMemberEmailAction, initialActionState);

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
            title="Editar email"
            className="ml-1 size-4 shrink-0 text-muted-foreground/60 hover:text-primary"
          />
        }
      >
        <Pencil className="size-3" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar email</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="workspaceId" value={workspaceId} />
          <input type="hidden" name="userId" value={userId} />
          <div className="space-y-2">
            <Label htmlFor="edit-member-email">Email</Label>
            <Input id="edit-member-email" name="email" type="email" defaultValue={emailAtual} required />
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
