"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
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
import { createRevisaoAction, type ActionState } from "../actions";
import type { ProximaRevisaoSpec } from "@/lib/statusGraph";

const initialActionState: ActionState = { status: "idle" };

export function CreateRevisaoButton({
  workspaceId,
  documentoId,
  spec,
}: {
  workspaceId: string;
  documentoId: string;
  spec: ProximaRevisaoSpec;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(createRevisaoAction, initialActionState);

  useEffect(() => {
    if (state.status === "error") toast.error(state.error);
    if (state.status === "success") setOpen(false);
  }, [state]);

  const titulo = spec.tipo === "as_built" ? "Iniciar As Built" : `Criar revisão ${spec.letra}${spec.numero}`;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>{titulo}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription>Os arquivos são opcionais e podem ser enviados depois.</DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="workspaceId" value={workspaceId} />
          <input type="hidden" name="documentoId" value={documentoId} />

          {spec.tipo !== "as_built" && (
            <div className="flex gap-3">
              <div className="space-y-1">
                <Label htmlFor="letra">Letra</Label>
                <Input id="letra" name="letra" defaultValue={spec.letra} maxLength={1} className="w-16 uppercase" required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="numero">Número</Label>
                <Input id="numero" name="numero" type="number" defaultValue={spec.numero} min={0} className="w-20" required />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="arquivoOriginal">Documento original</Label>
            <Input id="arquivoOriginal" name="arquivoOriginal" type="file" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="arquivoPdf">PDF</Label>
            <Input id="arquivoPdf" name="arquivoPdf" type="file" accept="application/pdf" />
          </div>

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
