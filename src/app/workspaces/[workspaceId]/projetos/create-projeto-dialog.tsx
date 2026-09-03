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
import { createProjetoAction, type ActionState } from "./actions";

const initialActionState: ActionState = { status: "idle" };

// Aberto/fechado normalmente é estado interno (uso padrão: botão "Novo projeto" com
// trigger próprio) — mas aceita `open`/`onOpenChange` controlados de fora pra quando o
// disparo vem de outro lugar sem DialogTrigger visível (ex: item de um dropdown menu).
export function CreateProjetoDialog({
  workspaceId,
  trigger,
  open: openControlado,
  onOpenChange: setOpenControlado,
}: {
  workspaceId: string;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const router = useRouter();
  const [openInterno, setOpenInterno] = useState(false);
  const open = openControlado ?? openInterno;
  const setOpen = setOpenControlado ?? setOpenInterno;
  const [code, setCode] = useState("");
  const [state, formAction, pending] = useActionState(createProjetoAction, initialActionState);

  useEffect(() => {
    if (state.status === "success") {
      setOpen(false);
      router.refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só dispara uma vez por submissão bem-sucedida
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ?? (openControlado === undefined && <DialogTrigger render={<Button />}>Novo projeto</DialogTrigger>)}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo projeto</DialogTitle>
          <DialogDescription>O código é o identificador curto usado no código dos documentos (ex: GNSE).</DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="workspaceId" value={workspaceId} />
          <div className="space-y-2">
            <Label htmlFor="code">Código</Label>
            <Input
              id="code"
              name="code"
              placeholder="ex: GNSE"
              required
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input id="name" name="name" placeholder="ex: Projeto Asa Branca" required />
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
