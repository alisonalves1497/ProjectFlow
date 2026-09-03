"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MoreHorizontal, Trash2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { deleteObraAction, type ActionState } from "../actions";

export function ObraMaisOpcoes({
  workspaceId,
  projetoId,
  obraId,
  obraNome,
}: {
  workspaceId: string;
  projetoId: string;
  obraId: string;
  obraNome: string;
}) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleExcluir() {
    setPending(true);
    const formData = new FormData();
    formData.set("workspaceId", workspaceId);
    formData.set("projetoId", projetoId);
    formData.set("obraId", obraId);
    const initialState: ActionState = { status: "idle" };
    const resultado = await deleteObraAction(initialState, formData);
    setPending(false);

    if (resultado.status === "error") {
      toast.error(resultado.error);
      return;
    }

    toast.success(`Obra excluída. Fica guardada na Lixeira por 30 dias.`);
    setConfirmOpen(false);
    router.push(`/workspaces/${workspaceId}/projetos/${projetoId}`);
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button
              type="button"
              className="rounded-md border p-1.5 text-muted-foreground hover:bg-accent"
              title="Mais opções"
            />
          }
        >
          <MoreHorizontal className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem variant="destructive" onClick={() => setConfirmOpen(true)}>
            <Trash2 className="size-4" />
            Excluir obra
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir obra &quot;{obraNome}&quot;?</DialogTitle>
            <DialogDescription>
              Isso oculta a Obra &quot;{obraNome}&quot; e todos os seus documentos. Nada é apagado de verdade — fica guardado
              por 30 dias na Lixeira, de onde dá pra restaurar.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" variant="destructive" disabled={pending} onClick={handleExcluir}>
              {pending ? "Excluindo..." : "Sim, tenho certeza — excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
