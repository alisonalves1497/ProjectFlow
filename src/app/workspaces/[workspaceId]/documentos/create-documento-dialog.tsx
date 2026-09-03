"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
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
import { createDocumentoAction, type ActionState } from "./actions";

const initialActionState: ActionState = { status: "idle" };

type Disciplina = { disciplinaId: string; code: string; name: string; secoes: { id: string; name: string }[] };
type Catalogo = { id: string; code: string; name: string };

export function CreateDocumentoDialog({
  workspaceId,
  projetoId,
  obraId,
  disciplinas,
  fases,
  tipos,
}: {
  workspaceId: string;
  projetoId: string;
  obraId: string;
  disciplinas: Disciplina[];
  fases: Catalogo[];
  tipos: Catalogo[];
}) {
  const [open, setOpen] = useState(false);
  const [disciplinaId, setDisciplinaId] = useState(disciplinas[0]?.disciplinaId ?? "");
  const [state, formAction, pending] = useActionState(createDocumentoAction, initialActionState);

  const secoesDaDisciplina = useMemo(
    () => disciplinas.find((d) => d.disciplinaId === disciplinaId)?.secoes ?? [],
    [disciplinas, disciplinaId]
  );

  useEffect(() => {
    if (state.status === "success") setOpen(false);
  }, [state]);

  const semCatalogo = disciplinas.length === 0 || fases.length === 0 || tipos.length === 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button disabled={semCatalogo} />}>
        <Plus className="size-4" />
        Novo
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo documento</DialogTitle>
          <DialogDescription>O código completo é gerado automaticamente a partir da obra, disciplina, fase e tipo.</DialogDescription>
        </DialogHeader>
        {semCatalogo ? (
          <p className="text-sm text-muted-foreground">
            Esta obra ainda não tem disciplina, fase ou tipo de documento cadastrados. Isso é feito por seed manual na Fase 1.
          </p>
        ) : (
          <form action={formAction} className="space-y-4">
            <input type="hidden" name="workspaceId" value={workspaceId} />
            <input type="hidden" name="projetoId" value={projetoId} />
            <input type="hidden" name="obraId" value={obraId} />

            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea id="descricao" name="descricao" required />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="disciplinaId">Disciplina</Label>
                <select
                  id="disciplinaId"
                  name="disciplinaId"
                  value={disciplinaId}
                  onChange={(e) => setDisciplinaId(e.target.value)}
                  className="h-9 w-full rounded-md border bg-transparent px-3 text-sm"
                >
                  {disciplinas.map((d) => (
                    <option key={d.disciplinaId} value={d.disciplinaId}>
                      {d.code} — {d.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="secaoId">Seção</Label>
                <select id="secaoId" name="secaoId" required className="h-9 w-full rounded-md border bg-transparent px-3 text-sm">
                  {secoesDaDisciplina.length === 0 && <option value="">Nenhuma seção nesta disciplina</option>}
                  {secoesDaDisciplina.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="faseId">Fase</Label>
                <select id="faseId" name="faseId" required className="h-9 w-full rounded-md border bg-transparent px-3 text-sm">
                  {fases.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.code} — {f.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="tipoDocumentoId">Tipo</Label>
                <select id="tipoDocumentoId" name="tipoDocumentoId" required className="h-9 w-full rounded-md border bg-transparent px-3 text-sm">
                  {tipos.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.code} — {t.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="dataBaseline">Data baseline</Label>
                <Input id="dataBaseline" name="dataBaseline" type="date" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dataPrevista">Data prevista</Label>
                <Input id="dataPrevista" name="dataPrevista" type="date" />
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
