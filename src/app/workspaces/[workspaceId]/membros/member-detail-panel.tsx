"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ALL_WORKSPACE_ROLES, WORKSPACE_ROLE_LABELS, WORKSPACE_ROLE_DESCRIPTIONS, type WorkspaceRole } from "@/lib/roles";
import { updateMemberAction, removeMemberAction, type ActionState } from "./actions";
import { EditMemberEmailDialog } from "./edit-member-email-dialog";
import { iniciais, type Membro, type Obra } from "./membros-screen";

const initialState: ActionState = { status: "idle" };

export function MemberDetailPanel({
  workspaceId,
  membro,
  obras,
  obraIdsAtuais,
  isSelf,
  isLastAdmin,
  canManage,
  isAdministrador,
}: {
  workspaceId: string;
  membro: Membro;
  obras: Obra[];
  obraIdsAtuais: string[];
  isSelf: boolean;
  isLastAdmin: boolean;
  canManage: boolean;
  isAdministrador: boolean;
}) {
  const [role, setRole] = useState<WorkspaceRole>(membro.role);
  const [obraIds, setObraIds] = useState<Set<string>>(new Set(obraIdsAtuais));
  const [pending, setPending] = useState(false);
  const [confirmRemover, setConfirmRemover] = useState(false);

  const isDirty = role !== membro.role || !mesmoConjunto(obraIds, obraIdsAtuais);

  // Guarda-corpo: não deixa tirar o único administrador do papel (o servidor também barra
  // isso, mas desabilitar aqui evita o usuário nem tentar e ver o erro só depois de salvar).
  const bloquearSairDeAdmin = isLastAdmin;

  function alternarObra(id: string) {
    setObraIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function marcarTodas() {
    setObraIds(new Set(obras.map((o) => o.id)));
  }
  function desmarcarTodas() {
    setObraIds(new Set());
  }
  const todasMarcadas = obras.length > 0 && obraIds.size === obras.length;

  async function salvar() {
    setPending(true);
    try {
      const formData = new FormData();
      formData.set("workspaceId", workspaceId);
      formData.set("userId", membro.userId);
      formData.set("role", role);
      formData.set("obraIds", JSON.stringify(role === "administrador" ? [] : [...obraIds]));
      const res = await updateMemberAction(initialState, formData);
      if (res.status === "error") {
        toast.error(res.error);
        return;
      }
      toast.success("Alterações salvas.");
    } finally {
      setPending(false);
    }
  }

  async function remover() {
    setPending(true);
    try {
      const formData = new FormData();
      formData.set("workspaceId", workspaceId);
      formData.set("userId", membro.userId);
      const res = await removeMemberAction(initialState, formData);
      if (res.status === "error") {
        toast.error(res.error);
        return;
      }
      toast.success("Membro removido.");
      setConfirmRemover(false);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b p-6">
        <div className="flex items-center gap-3">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-base font-semibold text-primary">
            {iniciais(membro.name ?? membro.email)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold">
              {membro.name ?? membro.email}
              {isSelf && <span className="ml-1.5 text-sm font-normal text-muted-foreground">(você)</span>}
            </p>
            <p className="flex items-center truncate text-xs text-muted-foreground">
              {membro.email}
              {canManage && <EditMemberEmailDialog workspaceId={workspaceId} userId={membro.userId} emailAtual={membro.email} />}
            </p>
          </div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Membro desde <span className="text-foreground">{new Date(membro.createdAt).toLocaleDateString("pt-BR")}</span>
        </p>
      </div>

      <div className="border-b p-6">
        <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">Papel</p>
        <Tabs value={role} onValueChange={(v) => canManage && isAdministrador && !isSelf && setRole(v as WorkspaceRole)}>
          <TabsList className="w-full">
            {ALL_WORKSPACE_ROLES.map((r) => (
              <TabsTrigger
                key={r}
                value={r}
                disabled={!canManage || !isAdministrador || isSelf || (bloquearSairDeAdmin && r !== "administrador")}
                className="flex-1"
              >
                {WORKSPACE_ROLE_LABELS[r]}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <p className="mt-2 text-xs text-muted-foreground">{WORKSPACE_ROLE_DESCRIPTIONS[role]}</p>
        {isSelf && <p className="mt-1 text-xs text-amber-600">Você não pode mudar seu próprio papel.</p>}
        {bloquearSairDeAdmin && !isSelf && (
          <p className="mt-1 text-xs text-amber-600">Não é possível rebaixar o único administrador do workspace.</p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto border-b p-6">
        {role === "administrador" ? (
          <div className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
            Acesso total a todas as Obras.
          </div>
        ) : (
          <>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Obras liberadas — {obraIds.size} de {obras.length}
              </p>
              {canManage && (
                <Button type="button" variant="link" className="h-auto p-0 text-xs" onClick={todasMarcadas ? desmarcarTodas : marcarTodas}>
                  {todasMarcadas ? "Desmarcar todas" : "Marcar todas"}
                </Button>
              )}
            </div>
            <div className="space-y-0.5">
              {obras.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma obra cadastrada ainda.</p>}
              {obras.map((o) => {
                const marcada = obraIds.has(o.id);
                return (
                  <label
                    key={o.id}
                    className={`flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-2 text-sm ${marcada ? "bg-primary/5" : "hover:bg-muted/40"} ${!canManage ? "cursor-default" : ""}`}
                  >
                    <input
                      type="checkbox"
                      className="checkbox-custom"
                      checked={marcada}
                      disabled={!canManage}
                      onChange={() => alternarObra(o.id)}
                    />
                    <span className="min-w-0 flex-1 truncate">{o.name}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">{o.projetoNome}</span>
                  </label>
                );
              })}
            </div>
          </>
        )}
      </div>

      {canManage && (
        <div className="mt-auto flex items-center gap-2 p-4">
          <Button type="button" onClick={salvar} disabled={!isDirty || pending}>
            {pending ? "Salvando..." : "Salvar alterações"}
          </Button>
          <Button
            type="button"
            variant="destructive"
            className="ml-auto"
            disabled={isSelf}
            title={isSelf ? "Você não pode remover a si mesmo." : undefined}
            onClick={() => setConfirmRemover(true)}
          >
            <Trash2 className="size-4" />
            Remover
          </Button>
        </div>
      )}

      <Dialog open={confirmRemover} onOpenChange={setConfirmRemover}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remover {membro.name ?? membro.email}?</DialogTitle>
            <DialogDescription>
              Essa pessoa perde o acesso ao workspace imediatamente. As permissões que ela tinha não ficam guardadas —
              se quiser adicionar de volta depois, vai ter que configurar tudo de novo.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirmRemover(false)}>
              Cancelar
            </Button>
            <Button type="button" variant="destructive" disabled={pending} onClick={remover}>
              {pending ? "Removendo..." : "Sim, remover"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function mesmoConjunto(a: Set<string>, bArr: string[]): boolean {
  if (a.size !== bArr.length) return false;
  return bArr.every((id) => a.has(id));
}
