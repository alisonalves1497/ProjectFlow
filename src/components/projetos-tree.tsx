"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import { ChevronRight, FileText, Settings, Plus, Layers, FolderPlus, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { ArvoreProjeto } from "@/services/navegacaoService";
import { CreateObraDialog } from "@/app/workspaces/[workspaceId]/projetos/[projetoId]/obras/create-obra-dialog";
import { RenameProjetoDialog } from "@/app/workspaces/[workspaceId]/projetos/rename-projeto-dialog";
import { RenameObraDialog } from "@/app/workspaces/[workspaceId]/projetos/[projetoId]/obras/rename-obra-dialog";

export function ProjetosTree({
  workspaceId,
  arvore,
  podeRenomear = false,
}: {
  workspaceId: string;
  arvore: ArvoreProjeto[];
  podeRenomear?: boolean;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const disciplinaIdAtiva = searchParams.get("disciplinaId");

  // Qual Projeto tem o dialog "Nova obra" aberto no momento — só um por vez, disparado
  // pelo item do dropdown do "+" (o dialog em si fica controlado, sem DialogTrigger próprio).
  const [novaObraProjetoId, setNovaObraProjetoId] = useState<string | null>(null);

  // Auto-expande o galho da Obra/Projeto atual na primeira renderização, pra quem chega
  // numa página de Documento já ver onde está na árvore, sem precisar reabrir na mão.
  const obraMatch = pathname.match(/\/projetos\/([^/]+)\/obras\/([^/]+)/);
  const [projetosAbertos, setProjetosAbertos] = useState<Set<string>>(new Set(obraMatch ? [obraMatch[1]] : []));
  const [obrasAbertas, setObrasAbertas] = useState<Set<string>>(new Set(obraMatch ? [obraMatch[2]] : []));

  // Projeto/Obra do galho atualmente visualizado, pra destacar em preto negrito na árvore
  // (o laranja fica reservado pro cabeçalho "Projetos" e pros itens de outros grupos).
  const projetoAtivoId = obraMatch?.[1];
  const obraAtivaId = obraMatch?.[2];

  function toggleProjeto(id: string) {
    setProjetosAbertos((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleObra(id: string) {
    setObrasAbertas((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (arvore.length === 0) {
    return <p className="px-2 text-xs text-muted-foreground">Nenhum projeto acessível.</p>;
  }

  return (
    <ul className="space-y-0.5">
      {arvore.map((projeto) => {
        const aberto = projetosAbertos.has(projeto.id);
        return (
          <li key={projeto.id}>
            <div className="group/projeto flex items-center">
              <button
                type="button"
                onClick={() => toggleProjeto(projeto.id)}
                className={cn(
                  "flex flex-1 items-center gap-1.5 rounded-md px-2 py-1.5 text-sm",
                  projeto.id === projetoAtivoId
                    ? "font-semibold text-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                <ChevronRight className={cn("size-3.5 shrink-0 transition-transform", aberto && "rotate-90")} />
                <span className="truncate text-left">{projeto.name.replace(/^projeto\s+/i, "")}</span>
              </button>
              {podeRenomear && <RenameProjetoDialog workspaceId={workspaceId} projetoId={projeto.id} nomeAtual={projeto.name} />}
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      title="Nova obra ou importar planilha"
                      className="mr-1 shrink-0 text-primary/40 opacity-0 hover:text-primary group-hover/projeto:opacity-100"
                    />
                  }
                >
                  <Plus className="size-3.5" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem onClick={() => setNovaObraProjetoId(projeto.id)}>
                    <FolderPlus className="size-4" />
                    Nova obra
                  </DropdownMenuItem>
                  <DropdownMenuItem render={<Link href={`/workspaces/${workspaceId}/importar?projetoId=${projeto.id}`} />}>
                    <FileSpreadsheet className="size-4" />
                    Importar planilha
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <CreateObraDialog
                workspaceId={workspaceId}
                projetoId={projeto.id}
                open={novaObraProjetoId === projeto.id}
                onOpenChange={(v) => setNovaObraProjetoId(v ? projeto.id : null)}
              />
            </div>
            {aberto && (
              <ul className="ml-3 space-y-0.5 border-l pl-2">
                {projeto.obras.map((obra) => {
                  const obraAberta = obrasAbertas.has(obra.id);
                  const obraBase = `/workspaces/${workspaceId}/projetos/${obra.projetoId}/obras/${obra.id}`;
                  return (
                    <li key={obra.id}>
                      <div className="group/obra flex items-center">
                        <button
                          type="button"
                          onClick={() => toggleObra(obra.id)}
                          className={cn(
                            "flex flex-1 items-center gap-1.5 rounded-md px-2 py-1.5 text-sm",
                            obra.id === obraAtivaId
                              ? "font-semibold text-foreground"
                              : "text-muted-foreground hover:bg-accent hover:text-foreground"
                          )}
                        >
                          <ChevronRight className={cn("size-3.5 shrink-0 transition-transform", obraAberta && "rotate-90")} />
                          <span className="truncate text-left">{obra.name}</span>
                        </button>
                        {podeRenomear && (
                          <RenameObraDialog workspaceId={workspaceId} projetoId={obra.projetoId} obraId={obra.id} nomeAtual={obra.name} />
                        )}
                        <Link
                          href={`${obraBase}/membros`}
                          title="Membros da obra"
                          className="mr-1 shrink-0 rounded p-1 text-primary/40 opacity-0 transition-opacity hover:text-primary group-hover/obra:opacity-100"
                        >
                          <Settings className="size-3.5" />
                        </Link>
                      </div>
                      {obraAberta && (
                        <ul className="ml-3 space-y-0.5 border-l pl-2">
                          <li>
                            <Link
                              href={obraBase}
                              className={cn(
                                "flex items-center gap-1.5 rounded-md px-2 py-1 text-sm",
                                pathname === obraBase && !disciplinaIdAtiva
                                  ? "bg-primary/10 font-medium text-primary"
                                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
                              )}
                            >
                              <FileText className="size-3.5 shrink-0" />
                              Documentos
                            </Link>
                          </li>
                          {obra.disciplinas.map((d) => {
                            const disciplinaAtiva = pathname === obraBase && disciplinaIdAtiva === d.disciplinaId;
                            return (
                              <li key={d.disciplinaId}>
                                <Link
                                  href={`${obraBase}?disciplinaId=${d.disciplinaId}`}
                                  className={cn(
                                    "flex items-center gap-1.5 truncate rounded-md py-1 pr-2 pl-6 text-sm",
                                    disciplinaAtiva
                                      ? "bg-primary/10 font-medium text-primary"
                                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                                  )}
                                >
                                  <Layers className="size-3.5 shrink-0" />
                                  <span className="truncate">{d.name}</span>
                                </Link>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </li>
        );
      })}
    </ul>
  );
}
