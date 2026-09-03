"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateItemAction, type ActionState } from "../../actions";

const initialActionState: ActionState = { status: "idle" };

type Disciplina = { id: string; code: string; name: string };
type Fornecedor = { id: string; nome: string };
type Item = {
  id: string;
  codigo: string | null;
  categoria: string | null;
  nome: string;
  quantidade: string;
  unidadeMedida: string;
  valorUnitario: string;
  valorTotal: string | null;
  disciplinaId: string;
  fornecedorId: string | null;
  prazoPrevisto: string | null;
  critico: boolean;
  numeroPedidoCompra: string | null;
};

export function EditItemForm({
  workspaceId,
  projetoId,
  obraId,
  item,
  disciplinas,
  fornecedores,
}: {
  workspaceId: string;
  projetoId: string;
  obraId: string;
  item: Item;
  disciplinas: Disciplina[];
  fornecedores: Fornecedor[];
}) {
  const [state, formAction, pending] = useActionState(updateItemAction, initialActionState);

  useEffect(() => {
    if (state.status === "error") toast.error(state.error);
    if (state.status === "success") toast.success("Item atualizado.");
  }, [state]);

  return (
    <form action={formAction} className="space-y-4 rounded-lg border p-4">
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <input type="hidden" name="projetoId" value={projetoId} />
      <input type="hidden" name="obraId" value={obraId} />
      <input type="hidden" name="itemId" value={item.id} />

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="codigo">Código</Label>
          <Input id="codigo" name="codigo" defaultValue={item.codigo ?? ""} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="categoria">Categoria</Label>
          <Input id="categoria" name="categoria" defaultValue={item.categoria ?? ""} />
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="nome">Nome</Label>
        <Input id="nome" name="nome" defaultValue={item.nome} required />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label htmlFor="quantidade">Quantidade</Label>
          <Input id="quantidade" name="quantidade" type="number" step="0.001" min="0.001" defaultValue={item.quantidade} required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="unidadeMedida">Unidade</Label>
          <Input id="unidadeMedida" name="unidadeMedida" defaultValue={item.unidadeMedida} required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="valorUnitario">Valor unitário</Label>
          <Input id="valorUnitario" name="valorUnitario" type="number" step="0.01" min="0" defaultValue={item.valorUnitario} required />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">Valor total atual: {item.valorTotal ? Number(item.valorTotal).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—"} (recalculado ao salvar)</p>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="disciplinaId">Disciplina</Label>
          <select id="disciplinaId" name="disciplinaId" defaultValue={item.disciplinaId} className="h-9 w-full rounded-md border bg-transparent px-3 text-sm">
            {disciplinas.map((d) => (
              <option key={d.id} value={d.id}>
                {d.code} — {d.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="fornecedorId">Fornecedor</Label>
          <select id="fornecedorId" name="fornecedorId" defaultValue={item.fornecedorId ?? ""} className="h-9 w-full rounded-md border bg-transparent px-3 text-sm">
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
          <Input id="prazoPrevisto" name="prazoPrevisto" type="date" defaultValue={item.prazoPrevisto ?? ""} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="numeroPedidoCompra">Nº pedido de compra</Label>
          <Input id="numeroPedidoCompra" name="numeroPedidoCompra" defaultValue={item.numeroPedidoCompra ?? ""} />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="critico" defaultChecked={item.critico} />
        Item crítico
      </label>

      <Button type="submit" disabled={pending}>
        {pending ? "Salvando..." : "Salvar alterações"}
      </Button>
    </form>
  );
}
