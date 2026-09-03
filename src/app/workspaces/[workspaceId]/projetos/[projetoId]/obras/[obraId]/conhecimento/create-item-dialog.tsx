"use client";

import { useActionState, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createItemConhecimentoAction, type ActionState } from "./actions";

const initialActionState: ActionState = { status: "idle" };

type DocumentoOpcao = { id: string; codigoCompleto: string; descricao: string };
type CategoriaOpcao = { id: string; code: string; name: string };

export function CreateItemDialog({
  workspaceId,
  projetoId,
  obraId,
  documentos,
  categorias,
  revalidatePathTarget,
  documentoIdFixo,
}: {
  workspaceId: string;
  projetoId: string;
  obraId: string;
  documentos: DocumentoOpcao[];
  categorias: CategoriaOpcao[];
  revalidatePathTarget: string;
  documentoIdFixo?: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(createItemConhecimentoAction, initialActionState);

  useEffect(() => {
    if (state.status === "success") setOpen(false);
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>+ Nova RFI/RNC</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova RFI/RNC</DialogTitle>
          <DialogDescription>RFI é uma pergunta que espera resposta. RNC é uma não conformidade que espera correção e verificação.</DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="workspaceId" value={workspaceId} />
          <input type="hidden" name="projetoId" value={projetoId} />
          <input type="hidden" name="obraId" value={obraId} />
          <input type="hidden" name="revalidatePathTarget" value={revalidatePathTarget} />
          {documentoIdFixo && <input type="hidden" name="documentoIds" value={documentoIdFixo} />}

          <div className="space-y-2">
            <Label htmlFor="tipo">Tipo</Label>
            <select id="tipo" name="tipo" required className="h-9 w-full rounded-md border bg-transparent px-3 text-sm">
              <option value="rfi">RFI — pergunta</option>
              <option value="rnc">RNC — não conformidade</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="titulo">Título</Label>
            <Input id="titulo" name="titulo" required maxLength={300} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea id="descricao" name="descricao" required />
          </div>

          {categorias.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="categoriaId">Categoria (opcional)</Label>
              <select id="categoriaId" name="categoriaId" className="h-9 w-full rounded-md border bg-transparent px-3 text-sm">
                <option value="">Sem categoria</option>
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} — {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {!documentoIdFixo && documentos.length > 0 && (
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
              {pending ? "Criando..." : "Criar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
