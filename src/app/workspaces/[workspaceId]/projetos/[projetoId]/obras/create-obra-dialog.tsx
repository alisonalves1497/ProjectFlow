"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createObraAction, type ActionState } from "./actions";

const initialActionState: ActionState = { status: "idle" };

export function CreateObraDialog({
  workspaceId,
  projetoId,
  trigger,
}: {
  workspaceId: string;
  projetoId: string;
  trigger?: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [state, formAction, pending] = useActionState(createObraAction, initialActionState);

  useEffect(() => {
    if (state.status === "success") {
      setOpen(false);
      router.refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só dispara uma vez por submissão bem-sucedida
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ?? <DialogTrigger render={<Button />}>Nova obra</DialogTrigger>}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova obra</DialogTitle>
          <DialogDescription>O código é o identificador curto usado no código dos documentos (ex: CTO).</DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="workspaceId" value={workspaceId} />
          <input type="hidden" name="projetoId" value={projetoId} />
          <div className="space-y-2">
            <Label htmlFor="obra-code">Código</Label>
            <Input
              id="obra-code"
              name="code"
              placeholder="ex: CTO"
              required
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="obra-name">Nome</Label>
            <Input id="obra-name" name="name" placeholder="ex: SE Cuitiba Oeste" required />
          </div>
          {state.status === "error" && <p className="text-sm text-destructive">{state.error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Criando..." : "Criar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
