"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  CalendarDays,
  FolderKanban,
  UserCog,
  Send,
  Home,
  ChevronDown,
  Plus,
  LogOut,
  Trash2,
  FileSpreadsheet,
  FolderPlus,
  Briefcase,
  Database,
  RefreshCw,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ProjetosTree } from "@/components/projetos-tree";
import { CreateProjetoDialog } from "@/app/workspaces/[workspaceId]/projetos/create-projeto-dialog";
import type { ArvoreProjeto } from "@/services/navegacaoService";
import { WORKSPACE_ROLE_LABELS, type WorkspaceRole } from "@/lib/roles";

type Role = WorkspaceRole;

type NavItem = { href: string; label: string; icon: LucideIcon; matchKeyword?: string };
type NavGroup = { label: string; icon?: LucideIcon; items: NavItem[] };

function iniciaisDoNome(nome: string): string {
  const partes = nome.trim().split(/\s+/);
  const primeira = partes[0]?.[0] ?? "";
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : "";
  return (primeira + ultima).toUpperCase();
}

export function AppSidebar({
  workspaceId,
  role,
  assistenteIaAtivo,
  arvore,
  userName,
  userEmail,
}: {
  workspaceId: string;
  role: Role;
  assistenteIaAtivo: boolean;
  arvore: ArvoreProjeto[];
  userName: string;
  userEmail: string;
}) {
  const pathname = usePathname();
  const [colapsados, setColapsados] = useState<Set<string>>(new Set());
  const [novoProjetoOpen, setNovoProjetoOpen] = useState(false);

  const wsBase = `/workspaces/${workspaceId}`;

  // assistenteIaAtivo não usado por enquanto: a Assistente IA ainda não tem página solta
  // no modelo unificado, permanece desligada via feature flag.
  void assistenteIaAtivo;

  const principalGroup: NavGroup = {
    label: "Principal",
    icon: Home,
    items: [
      { href: wsBase, label: "Painel", icon: LayoutDashboard },
      { href: `${wsBase}/calendario`, label: "Calendário", icon: CalendarDays },
    ],
  };

  // Qualidade (Cópias Controladas, Registro Fotográfico, Base de Conhecimento) e
  // Suprimentos ocultos por pedido — telas continuam existindo, só não aparecem no menu.
  const outrosGrupos: NavGroup[] = [
    {
      label: "Gestão",
      icon: Briefcase,
      items: [{ href: `${wsBase}/grd`, label: "GRD", icon: Send, matchKeyword: "grd" }],
    },
    {
      label: "Cadastros",
      icon: Database,
      items: [
        { href: `${wsBase}/membros`, label: "Membros e permissões", icon: UserCog },
        ...(role === "administrador" || role === "coordenador"
          ? [{ href: `${wsBase}/lixeira`, label: "Lixeira", icon: Trash2 }]
          : []),
      ],
    },
  ];

  const podeGerenciarProjetos = role === "administrador" || role === "coordenador";

  function isActive(item: NavItem) {
    if (item.matchKeyword) return pathname.includes(`/${item.matchKeyword}`);
    if (item.href === wsBase) return pathname === item.href;
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  }

  function toggleGrupo(label: string) {
    setColapsados((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }

  // `trailing` reserva sempre a mesma largura (size-6) depois do chevron, esteja vazio ou
  // não — é isso que mantém o chevron de TODOS os grupos alinhado na mesma coluna, mesmo o
  // de "Projetos" que tem o botão "+" ali (sem o slot reservado, o "+" empurraria só o
  // chevron dele pra esquerda, desalinhando da coluna dos outros grupos).
  function renderGrupoHeader(label: string, icon?: LucideIcon, ativo?: boolean, trailing?: React.ReactNode) {
    const GroupIcon = icon;
    const colapsado = colapsados.has(label);
    return (
      <div className="mb-1 flex w-full items-center gap-1 px-2 text-xs font-medium tracking-wide uppercase">
        <button
          type="button"
          onClick={() => toggleGrupo(label)}
          className={cn(
            "flex min-w-0 flex-1 items-center gap-1",
            ativo ? "text-primary font-semibold" : "text-muted-foreground"
          )}
        >
          {GroupIcon && <GroupIcon className="size-3.5 shrink-0" />}
          <span className="flex-1 truncate text-left">{label}</span>
          <ChevronDown className={cn("size-3.5 shrink-0 transition-transform", colapsado && "-rotate-90")} />
        </button>
        <span className="flex size-6 shrink-0 items-center justify-center">{trailing}</span>
      </div>
    );
  }

  const emArvoreDeProjetos = /\/projetos\/[^/]+\/obras\/[^/]+/.test(pathname);

  const nomeExibido = userName || userEmail;

  return (
    <aside className="flex min-h-screen w-56 shrink-0 flex-col border-r bg-muted">
      <div className="flex justify-center border-b p-4">
        <Image src="/logo-enermais.png" alt="EnerMais" width={160} height={48} className="h-10 w-auto" priority />
      </div>

      <nav className="p-3">
        <div className="mb-4">
          {renderGrupoHeader(principalGroup.label, principalGroup.icon, principalGroup.items.some(isActive))}
          {!colapsados.has(principalGroup.label) && (
            <ul className="space-y-0.5">
              {principalGroup.items.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition",
                        isActive(item)
                          ? "bg-primary/10 font-medium text-primary"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground"
                      )}
                    >
                      <Icon className="size-4 shrink-0" />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {outrosGrupos.map((group) => (
          <div key={group.label} className="mb-4">
            {renderGrupoHeader(group.label, group.icon, group.items.some(isActive))}
            {!colapsados.has(group.label) && (
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={cn(
                          "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition",
                          isActive(item)
                            ? "bg-primary/10 font-medium text-primary"
                            : "text-muted-foreground hover:bg-accent hover:text-foreground"
                        )}
                      >
                        <Icon className="size-4 shrink-0" />
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
            {group.label === "Gestão" && (
              <div className="mt-4">
                {renderGrupoHeader(
                  "Projetos",
                  FolderKanban,
                  emArvoreDeProjetos,
                  podeGerenciarProjetos && (
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            title="Novo projeto ou importar planilha"
                            className="shrink-0 text-primary/40 hover:text-primary"
                          />
                        }
                      >
                        <Plus className="size-3.5" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        <DropdownMenuItem onClick={() => setNovoProjetoOpen(true)}>
                          <FolderPlus className="size-4" />
                          Criar projeto novo
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          render={<Link href={`${wsBase}/importar`} />}
                        >
                          <FileSpreadsheet className="size-4" />
                          Importar planilha
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          render={<Link href={`${wsBase}/sincronizar-portfolio`} />}
                        >
                          <RefreshCw className="size-4" />
                          Sincronizar Portfólio
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )
                )}
                {!colapsados.has("Projetos") && (
                  <div className="mt-1">
                    <ProjetosTree workspaceId={workspaceId} arvore={arvore} podeRenomear={podeGerenciarProjetos} />
                  </div>
                )}
                <CreateProjetoDialog workspaceId={workspaceId} open={novoProjetoOpen} onOpenChange={setNovoProjetoOpen} />
              </div>
            )}
          </div>
        ))}
      </nav>

      <div className="flex items-center gap-2 border-t p-3">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
          {iniciaisDoNome(nomeExibido)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{nomeExibido}</p>
          <p className="truncate text-xs text-muted-foreground">{WORKSPACE_ROLE_LABELS[role]}</p>
        </div>
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/login" })}
          title="Sair"
          className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <LogOut className="size-4" />
        </button>
      </div>
    </aside>
  );
}
