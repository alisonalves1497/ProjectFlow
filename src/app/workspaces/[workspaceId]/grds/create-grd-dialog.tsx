"use client";

import { useActionState, useEffect, useState } from "react";
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
import { createGrdAction, type ActionState } from "./actions";

const initialActionState: ActionState = { status: "idle" };

type DocumentoOpcao = { id: string; codigoCompleto: string; descricao: string; temRevisao: boolean };
type ContatoOpcao = { id: string; nome: string; email: string };

export function CreateGrdDialog({
  workspaceId,
  projetoId,
  obraId,
  documentos,
  contatos,
  initialSelectedDocumentoIds,
  open: openProp,
  onOpenChange: onOpenChangeProp,
  trigger,
}: {
  workspaceId: string;
  projetoId: string;
  obraId: string;
  documentos: DocumentoOpcao[];
  contatos: ContatoOpcao[];
  initialSelectedDocumentoIds?: string[];
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
}) {
  const [openState, setOpenState] = useState(false);
  const open = openProp ?? openState;
  const setOpen = onOpenChangeProp ?? setOpenState;
  const [state, formAction, pending] = useActionState(createGrdAction, initialActionState);

  useEffect(() => {
    if (state.status === "success") setOpen(false);
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ?? <DialogTrigger render={<Button disabled={contatos.length === 0} />}>Novo GRD</DialogTrigger>}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo GRD</DialogTitle>
          <DialogDescription>O código é gerado automaticamente. Cada documento é travado na revisão atual dele.</DialogDescription>
        </DialogHeader>

        {contatos.length === 0 ? (
          <p className="text-sm text-muted-foreground">Cadastre pelo menos um contato externo (em "Contatos", no workspace) antes de criar um GRD.</p>
        ) : (
          <form action={formAction} className="space-y-4">
            <input type="hidden" name="workspaceId" value={workspaceId} />
            <input type="hidden" name="projetoId" value={projetoId} />
            <input type="hidden" name="obraId" value={obraId} />

            <div className="space-y-2">
              <Label htmlFor="dataEmissao">Data de emissão</Label>
              <Input id="dataEmissao" name="dataEmissao" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} />
            </div>

            <div className="space-y-2">
              <Label>Documentos</Label>
              <div className="max-h-40 space-y-1 overflow-y-auto rounded-md border p-2">
                {documentos.length === 0 && <p className="text-sm text-muted-foreground">Nenhum documento nesta obra.</p>}
                {documentos.map((d) => (
                  <label key={d.id} className={`flex items-center gap-2 text-sm ${!d.temRevisao ? "opacity-40" : ""}`}>
                    <input
                      type="checkbox"
                      name="documentoIds"
                      value={d.id}
                      disabled={!d.temRevisao}
                      defaultChecked={initialSelectedDocumentoIds?.includes(d.id)}
                    />
                    <span className="font-mono text-xs">{d.codigoCompleto}</span>
                    <span className="text-muted-foreground">{d.descricao}</span>
                    {!d.temRevisao && <span className="text-xs text-muted-foreground">(sem revisão ainda)</span>}
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Destinatários</Label>
              <div className="max-h-32 space-y-1 overflow-y-auto rounded-md border p-2">
                {contatos.map((c) => (
                  <label key={c.id} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="contatoExternoIds" value={c.id} />
                    <span>{c.nome}</span>
                    <span className="text-muted-foreground">({c.email})</span>
                  </label>
                ))}
              </div>
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
