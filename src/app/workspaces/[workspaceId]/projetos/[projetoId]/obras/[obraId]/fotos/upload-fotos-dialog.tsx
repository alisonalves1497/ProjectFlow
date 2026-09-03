"use client";

import { useActionState, useEffect, useRef, useState } from "react";
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
import { uploadFotosAction, type ActionState } from "./actions";

const initialActionState: ActionState = { status: "idle" };

type DocumentoOpcao = { id: string; codigoCompleto: string; descricao: string };

export function UploadFotosDialog({
  workspaceId,
  obraId,
  revalidatePathTarget,
  documentos,
}: {
  workspaceId: string;
  obraId: string;
  revalidatePathTarget: string;
  documentos: DocumentoOpcao[];
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(uploadFotosAction, initialActionState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === "success") {
      setOpen(false);
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>Adicionar fotos</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar fotos</DialogTitle>
          <DialogDescription>JPEG, PNG ou WebP, até 10MB cada. A legenda é aplicada a todas as fotos selecionadas.</DialogDescription>
        </DialogHeader>
        <form ref={formRef} action={formAction} className="space-y-4">
          <input type="hidden" name="workspaceId" value={workspaceId} />
          <input type="hidden" name="obraId" value={obraId} />
          <input type="hidden" name="revalidatePathTarget" value={revalidatePathTarget} />

          <div className="space-y-2">
            <Label htmlFor="arquivos">Fotos</Label>
            <Input id="arquivos" name="arquivos" type="file" accept="image/jpeg,image/png,image/webp" multiple required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="legenda">Legenda (opcional, aplicada a todas)</Label>
            <Input id="legenda" name="legenda" placeholder="Ex: Fundação bloco B, vista frontal" />
          </div>

          {documentos.length > 0 && (
            <div className="space-y-2">
              <Label>Vincular a documentos (opcional)</Label>
              <div className="max-h-32 space-y-1 overflow-y-auto rounded-md border p-2">
                {documentos.map((d) => (
                  <label key={d.id} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="documentoIds" value={d.id} />
                    <span className="font-mono text-xs">{d.codigoCompleto}</span>
                    <span className="text-muted-foreground">{d.descricao}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {state.status === "error" && <p className="text-sm text-destructive">{state.error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Enviando..." : "Enviar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
