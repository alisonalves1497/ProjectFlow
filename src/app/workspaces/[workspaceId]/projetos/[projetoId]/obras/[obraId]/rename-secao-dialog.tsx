"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { renomearSecaoAction, type ActionState } from "../../../../documentos/actions";

const initialActionState: ActionState = { status: "idle" };

export function RenameSecaoDialog({
  workspaceId,
  projetoId,
  obraId,
  secaoId,
  nomeAtual,
}: {
  workspaceId: string;
  projetoId: string;
  obraId: string;
  secaoId: string;
  nomeAtual: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(renomearSecaoAction, initialActionState);

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
            title="Renomear seção"
            onClick={(e) => e.stopPropagation()}
            className="shrink-0 text-current opacity-60 hover:opacity-100"
          />
        }
      >
        <Pencil className="size-3.5" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Renomear seção</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="workspaceId" value={workspaceId} />
          <input type="hidden" name="projetoId" value={projetoId} />
          <input type="hidden" name="obraId" value={obraId} />
          <input type="hidden" name="secaoId" value={secaoId} />
          <div className="space-y-2">
            <Label htmlFor="rename-secao-name">Nome da seção</Label>
            <Input id="rename-secao-name" name="name" defaultValue={nomeAtual} required maxLength={200} />
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
