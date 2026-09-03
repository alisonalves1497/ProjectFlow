"use client";

import { useActionState, useEffect, useState } from "react";
import { Pencil } from "lucide-react";
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
import { updateDocumentoAction, type ActionState } from "../actions";

const initialActionState: ActionState = { status: "idle" };

export function EditDocumentoDialog({
  workspaceId,
  documentoId,
  descricaoAtual,
  codigoAtual,
  secaoIdAtual,
  secoesDaDisciplina,
  dataBaselineAtual,
  dataReprogramadaAtual,
  responsavelIdAtual,
  obraUsers,
}: {
  workspaceId: string;
  documentoId: string;
  descricaoAtual: string;
  codigoAtual: string;
  secaoIdAtual: string;
  secoesDaDisciplina: { id: string; name: string }[];
  dataBaselineAtual: string | null;
  dataReprogramadaAtual: string | null;
  responsavelIdAtual: string | null;
  obraUsers: { userId: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(updateDocumentoAction, initialActionState);

  useEffect(() => {
    if (state.status === "success") setOpen(false);
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button type="button" variant="outline" size="sm">
            <Pencil className="size-3.5" />
            Editar
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar documento</DialogTitle>
          <DialogDescription>Ajustes cosméticos — mudar o status de verdade acontece pela aba Revisões.</DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="workspaceId" value={workspaceId} />
          <input type="hidden" name="documentoId" value={documentoId} />

          <div className="space-y-2">
            <Label htmlFor="descricao">Item</Label>
            <Input id="descricao" name="descricao" defaultValue={descricaoAtual} required maxLength={500} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="codigoCompleto">Código do item</Label>
            <Input id="codigoCompleto" name="codigoCompleto" defaultValue={codigoAtual} required maxLength={120} className="font-mono" />
            <p className="text-xs text-muted-foreground">
              Normalmente é gerado automático (Projeto-Obra-Fase-Disciplina-Tipo-Sequencial). Editar aqui não afeta a
              numeração automática dos próximos documentos — só evite duplicar um código já usado.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="secaoId">Seção</Label>
            <select
              id="secaoId"
              name="secaoId"
              defaultValue={secaoIdAtual}
              required
              className="h-9 w-full rounded-md border bg-transparent px-3 text-sm"
            >
              {secoesDaDisciplina.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              Só é possível mover pra outra seção dentro da mesma disciplina do documento.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="dataBaseline">Baseline</Label>
              <Input id="dataBaseline" name="dataBaseline" type="date" defaultValue={dataBaselineAtual ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dataReprogramada">Reprogramada</Label>
              <Input id="dataReprogramada" name="dataReprogramada" type="date" defaultValue={dataReprogramadaAtual ?? ""} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="responsavelId">Responsável</Label>
            <select
              id="responsavelId"
              name="responsavelId"
              defaultValue={responsavelIdAtual ?? ""}
              className="h-9 w-full rounded-md border bg-transparent px-3 text-sm"
            >
              <option value="">Sem responsável</option>
              {obraUsers.map((u) => (
                <option key={u.userId} value={u.userId}>
                  {u.name}
                </option>
              ))}
            </select>
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
