"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { renameObraAction, type ActionState } from "./actions";

const initialActionState: ActionState = { status: "idle" };

export function RenameObraDialog({
  workspaceId,
  projetoId,
  obraId,
  nomeAtual,
  className,
}: {
  workspaceId: string;
  projetoId: string;
  obraId: string;
  nomeAtual: string;
  className?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(renameObraAction, initialActionState);

  useEffect(() => {
    if (state.status === "success") {
      setOpen(false);
      router.refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só dispara uma vez por submissão bem-sucedida
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            title="Renomear obra"
            className={className ?? "mr-1 shrink-0 text-primary/40 opacity-0 hover:text-primary group-hover/obra:opacity-100"}
          />
        }
      >
        <Pencil className="size-3.5" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Renomear obra</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="workspaceId" value={workspaceId} />
          <input type="hidden" name="projetoId" value={projetoId} />
          <input type="hidden" name="obraId" value={obraId} />
          <div className="space-y-2">
            <Label htmlFor="rename-obra-name">Nome</Label>
            <Input id="rename-obra-name" name="name" defaultValue={nomeAtual} required maxLength={200} />
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
