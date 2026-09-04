"use client";

import { useMemo, useState } from "react";
import { UserCog, UserPlus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ALL_WORKSPACE_ROLES, WORKSPACE_ROLE_LABELS, type WorkspaceRole } from "@/lib/roles";
import { MemberDetailPanel } from "./member-detail-panel";
import { InviteMemberDialog } from "./invite-member-dialog";

export type Membro = { userId: string; name: string | null; email: string; role: WorkspaceRole; createdAt: Date };
export type Obra = { id: string; name: string; code: string; projetoId: string; projetoNome: string };

// Versão simples/local só pra filtrar a busca client-side — não pode importar a normalizar()
// de services/importDocumentosService.ts aqui (puxa o client do banco pro bundle do browser).
function normalizarBusca(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toUpperCase();
}

export function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/);
  const primeira = partes[0]?.[0] ?? "";
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : "";
  return (primeira + ultima).toUpperCase();
}

export function MembrosScreen({
  workspaceId,
  membros,
  obras,
  obraIdsPorUsuario,
  currentUserId,
  isAdministrador,
  canManage,
}: {
  workspaceId: string;
  membros: Membro[];
  obras: Obra[];
  obraIdsPorUsuario: Record<string, string[]>;
  currentUserId: string;
  isAdministrador: boolean;
  canManage: boolean;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(membros[0]?.userId ?? null);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | WorkspaceRole>("all");
  const [inviteOpen, setInviteOpen] = useState(false);

  const obraNamePorId = useMemo(() => new Map(obras.map((o) => [o.id, o.name])), [obras]);

  const filtrados = useMemo(() => {
    const q = normalizarBusca(query.trim());
    return membros.filter((m) => {
      if (roleFilter !== "all" && m.role !== roleFilter) return false;
      if (!q) return true;
      const obraNomes = (obraIdsPorUsuario[m.userId] ?? []).map((id) => obraNamePorId.get(id) ?? "").join(" ");
      const alvo = normalizarBusca(`${m.name ?? ""} ${m.email} ${obraNomes}`);
      return alvo.includes(q);
    });
  }, [membros, query, roleFilter, obraIdsPorUsuario, obraNamePorId]);

  const selecionado = membros.find((m) => m.userId === selectedId) ?? null;
  const adminCount = membros.filter((m) => m.role === "administrador").length;

  return (
    <div className="p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Cadastros</p>
          <div className="mt-0.5 flex items-center gap-2">
            <UserCog className="size-5 shrink-0 text-muted-foreground" />
            <h1 className="text-2xl font-semibold">Membros e permissões</h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            {membros.length} membro{membros.length !== 1 ? "s" : ""}
          </span>
          {canManage && (
            <Button type="button" onClick={() => setInviteOpen(true)}>
              <UserPlus className="size-4" />
              Adicionar membro
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_420px]">
        <div className="flex flex-col overflow-hidden rounded-lg border">
          <div className="flex flex-col gap-2 border-b p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por nome, e-mail ou obra"
                className="pl-7.5"
              />
            </div>
            <Tabs value={roleFilter} onValueChange={(v) => setRoleFilter(v as "all" | WorkspaceRole)} className="w-full">
              <TabsList className="w-full flex-wrap">
                <TabsTrigger value="all">Todos</TabsTrigger>
                {ALL_WORKSPACE_ROLES.map((r) => (
                  <TabsTrigger key={r} value={r}>
                    {WORKSPACE_ROLE_LABELS[r]}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>

          <div className="grid grid-cols-[1fr_140px_100px] gap-4 border-b bg-muted/30 px-4 py-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            <span>Membro</span>
            <span>Papel</span>
            <span>Obras</span>
          </div>

          <div className="max-h-[65vh] overflow-y-auto">
            {filtrados.length === 0 ? (
              <div className="flex flex-col items-center gap-2 p-8 text-center text-sm text-muted-foreground">
                <p>Nenhum membro corresponde a esta busca.</p>
                <Button
                  type="button"
                  variant="link"
                  className="h-auto p-0"
                  onClick={() => {
                    setQuery("");
                    setRoleFilter("all");
                  }}
                >
                  Limpar filtros
                </Button>
              </div>
            ) : (
              filtrados.map((m) => {
                const obraIds = obraIdsPorUsuario[m.userId] ?? [];
                const obrasLabel = m.role === "administrador" ? "Todas" : obraIds.length === 0 ? "—" : `${obraIds.length} de ${obras.length}`;
                const ativo = m.userId === selectedId;
                return (
                  <button
                    key={m.userId}
                    type="button"
                    onClick={() => setSelectedId(m.userId)}
                    className={`grid w-full grid-cols-[1fr_140px_100px] items-center gap-4 border-b px-4 py-3 text-left transition-colors last:border-b-0 ${
                      ativo ? "border-l-3 border-l-primary bg-primary/5 pl-3.5" : "hover:bg-muted/40"
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                        {iniciais(m.name ?? m.email)}
                      </div>
                      <div className="min-w-0 leading-tight">
                        <p className="truncate text-sm font-medium">
                          {m.name ?? m.email}
                          {m.userId === currentUserId && <span className="ml-1 font-normal text-muted-foreground">(você)</span>}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">{m.email}</p>
                      </div>
                    </div>
                    <span className="truncate text-sm text-muted-foreground">{WORKSPACE_ROLE_LABELS[m.role]}</span>
                    <span className="truncate text-sm text-muted-foreground">{obrasLabel}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border">
          {selecionado ? (
            <MemberDetailPanel
              key={selecionado.userId}
              workspaceId={workspaceId}
              membro={selecionado}
              obras={obras}
              obraIdsAtuais={obraIdsPorUsuario[selecionado.userId] ?? []}
              isSelf={selecionado.userId === currentUserId}
              isLastAdmin={selecionado.role === "administrador" && adminCount <= 1}
              canManage={canManage}
              isAdministrador={isAdministrador}
            />
          ) : (
            <div className="flex h-full items-center justify-center p-8 text-sm text-muted-foreground">
              Selecione um membro pra ver os detalhes.
            </div>
          )}
        </div>
      </div>

      {canManage && <InviteMemberDialog workspaceId={workspaceId} open={inviteOpen} onOpenChange={setInviteOpen} />}
    </div>
  );
}
