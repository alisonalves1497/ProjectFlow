"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type ActionState = { status: "idle" } | { status: "error"; error: string } | { status: "success" };

export function ConfirmDeleteDialog({
  titulo,
  itemNome,
  explicacao,
  action,
  hiddenFields,
  triggerLabel = "Excluir",
  triggerVariant = "ghost",
}: {
  titulo: string;
  itemNome: string;
  explicacao: string;
  action: (prevState: ActionState, formData: FormData) => Promise<ActionState>;
  hiddenFields: Record<string, string>;
  triggerLabel?: string;
  triggerVariant?: "ghost" | "outline" | "destructive";
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(action, { status: "idle" } as ActionState);

  useEffect(() => {
    if (state.status === "error") toast.error(state.error);
    if (state.status === "success") {
      setOpen(false);
      toast.success(`${titulo} excluído. Fica guardado na Lixeira por 30 dias.`);
    }
  }, [state, titulo]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            type="button"
            variant={triggerVariant}
            size="sm"
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
            className={triggerVariant === "ghost" ? "text-muted-foreground hover:text-destructive" : undefined}
          />
        }
      >
        <Trash2 className="size-4" />
        {triggerLabel !== "Excluir" && triggerLabel}
      </DialogTrigger>
      <DialogContent onClick={(e: React.MouseEvent) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="size-4 shrink-0 text-destructive" />
            Excluir {titulo.toLowerCase()} &quot;{itemNome}&quot;?
          </DialogTitle>
          <DialogDescription>{explicacao}</DialogDescription>
        </DialogHeader>
        <form action={formAction}>
          {Object.entries(hiddenFields).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="destructive" disabled={pending}>
              {pending ? "Excluindo..." : "Sim, tenho certeza — excluir"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
