"use client";

import { useRouter } from "next/navigation";
import { Building2, FolderKanban, ChevronDown } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent, PopoverClose } from "@/components/ui/popover";
import type { ObraOpcao } from "@/services/navegacaoService";

export function ObraSwitcher({
  workspaceId,
  obras,
  obraAtualId,
  disciplinaAtual,
}: {
  workspaceId: string;
  obras: ObraOpcao[];
  obraAtualId: string;
  disciplinaAtual?: string;
}) {
  const router = useRouter();
  const atual = obras.find((o) => o.id === obraAtualId);

  return (
    <Popover>
      <PopoverTrigger
        render={
          <button
            type="button"
            className="flex w-full min-w-[26rem] items-center gap-2 rounded-lg border bg-card py-1.5 pr-3 pl-3 text-left hover:border-primary/40"
          />
        }
      >
        <Building2 className="size-4 shrink-0 text-primary/60" />
        <div className="flex-1 leading-tight">
          {atual ? (
            <>
              <p className="text-[0.65rem] font-medium tracking-wide text-muted-foreground uppercase">{atual.projetoNome}</p>
              <p className="text-sm font-semibold">
                {atual.obraNome}
                {disciplinaAtual && <span className="font-normal text-muted-foreground"> · {disciplinaAtual}</span>}
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Selecione um projeto...</p>
          )}
        </div>
        <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent align="center" className="w-[26rem] p-2">
        <p className="mb-1 px-2 pt-1 text-[0.65rem] font-semibold tracking-wide text-muted-foreground uppercase">Selecionar projeto</p>
        <div className="flex flex-col gap-1">
          {obras.map((obra) => (
            <PopoverClose
              key={obra.id}
              render={
                <button
                  type="button"
                  onClick={() => router.push(`/workspaces/${workspaceId}/projetos/${obra.projetoId}/obras/${obra.id}`)}
                />
              }
              className="flex items-center gap-2.5 rounded-lg border border-transparent px-2 py-2 text-left hover:border-primary/40 hover:bg-primary/5"
            >
              <FolderKanban className="size-4 shrink-0 text-primary/60" />
              <div className="min-w-0 flex-1 leading-tight">
                <p className="truncate text-[0.65rem] font-medium tracking-wide text-muted-foreground uppercase">
                  {obra.projetoNome}
                </p>
                <p className="truncate text-sm font-semibold">{obra.obraNome}</p>
              </div>
              <span className="shrink-0 font-mono text-xs text-muted-foreground">{obra.obraCode}</span>
            </PopoverClose>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
