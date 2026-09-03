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
import { createItemAction, type ActionState } from "../actions";

const initialActionState: ActionState = { status: "idle" };

type Disciplina = { id: string; code: string; name: string };
type Fornecedor = { id: string; nome: string };
type DocumentoOpcao = { id: string; codigoCompleto: string; descricao: string };

export function CreateItemDialog({
  workspaceId,
  projetoId,
  obraId,
  disciplinas,
  fornecedores,
  documentos,
}: {
  workspaceId: string;
  projetoId: string;
  obraId: string;
  disciplinas: Disciplina[];
  fornecedores: Fornecedor[];
  documentos: DocumentoOpcao[];
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(createItemAction, initialActionState);

  useEffect(() => {
    if (state.status === "success") setOpen(false);
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button disabled={disciplinas.length === 0} />}>Novo item</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo item de suprimento</DialogTitle>
          <DialogDescription>Valor total é calculado automaticamente (quantidade × valor unitário).</DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="workspaceId" value={workspaceId} />
          <input type="hidden" name="projetoId" value={projetoId} />
          <input type="hidden" name="obraId" value={obraId} />

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="codigo">Código</Label>
              <Input id="codigo" name="codigo" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="categoria">Categoria</Label>
              <Input id="categoria" name="categoria" />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="nome">Nome</Label>
            <Input id="nome" name="nome" required />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label htmlFor="quantidade">Quantidade</Label>
              <Input id="quantidade" name="quantidade" type="number" step="0.001" min="0.001" required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="unidadeMedida">Unidade</Label>
              <Input id="unidadeMedida" name="unidadeMedida" placeholder="un, kg, m²..." required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="valorUnitario">Valor unitário</Label>
              <Input id="valorUnitario" name="valorUnitario" type="number" step="0.01" min="0" required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="disciplinaId">Disciplina</Label>
              <select id="disciplinaId" name="disciplinaId" required className="h-9 w-full rounded-md border bg-transparent px-3 text-sm">
                {disciplinas.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.code} — {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="fornecedorId">Fornecedor</Label>
              <select id="fornecedorId" name="fornecedorId" className="h-9 w-full rounded-md border bg-transparent px-3 text-sm">
                <option value="">— nenhum —</option>
                {fornecedores.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.nome}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="prazoPrevisto">Prazo previsto</Label>
              <Input id="prazoPrevisto" name="prazoPrevisto" type="date" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="numeroPedidoCompra">Nº pedido de compra</Label>
              <Input id="numeroPedidoCompra" name="numeroPedidoCompra" />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="critico" />
            Item crítico
          </label>

          {documentos.length > 0 && (
            <div className="space-y-2">
              <Label>Documentos de origem (opcional)</Label>
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
