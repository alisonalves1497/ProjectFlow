"use client";

import { useActionState, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
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
import { createCopiaControladaAction, type ActionState } from "./actions";

const initialActionState: ActionState = { status: "idle" };

type DocumentoOpcao = { id: string; codigoCompleto: string; descricao: string; temRevisao: boolean };
type UsuarioOpcao = { userId: string; name: string | null; email: string };

export function CreateCopiaDialog({
  workspaceId,
  projetoId,
  obraId,
  documentos,
  usuarios,
}: {
  workspaceId: string;
  projetoId: string;
  obraId: string;
  documentos: DocumentoOpcao[];
  usuarios: UsuarioOpcao[];
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(createCopiaControladaAction, initialActionState);

  useEffect(() => {
    if (state.status === "success") setOpen(false);
  }, [state]);

  const documentosComRevisao = documentos.filter((d) => d.temRevisao);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button disabled={documentosComRevisao.length === 0 || usuarios.length === 0} />}>Nova cópia controlada</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova cópia controlada</DialogTitle>
          <DialogDescription>Trava a revisão atual do documento pro detentor selecionado.</DialogDescription>
        </DialogHeader>

        {documentosComRevisao.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum documento com revisão emitida nesta obra ainda.</p>
        ) : (
          <form action={formAction} className="space-y-4">
            <input type="hidden" name="workspaceId" value={workspaceId} />
            <input type="hidden" name="projetoId" value={projetoId} />
            <input type="hidden" name="obraId" value={obraId} />

            <div className="space-y-2">
              <Label htmlFor="documentoId">Documento</Label>
              <select id="documentoId" name="documentoId" required className="h-9 w-full rounded-md border bg-transparent px-3 text-sm">
                {documentosComRevisao.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.codigoCompleto} — {d.descricao}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="detentorId">Detentor</Label>
              <select id="detentorId" name="detentorId" required className="h-9 w-full rounded-md border bg-transparent px-3 text-sm">
                {usuarios.map((u) => (
                  <option key={u.userId} value={u.userId}>
                    {u.name ?? u.email} ({u.email})
                  </option>
                ))}
              </select>
            </div>

            {state.status === "error" && <p className="text-sm text-destructive">{state.error}</p>}
            <DialogFooter>
              <Button type="submit" disabled={pending}>
                {pending ? "Criando..." : "Criar"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
