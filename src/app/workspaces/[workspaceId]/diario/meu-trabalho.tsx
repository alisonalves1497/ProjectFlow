"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ResizeHandleVertical } from "@/components/ui/resize-handle-vertical";
import type { MeuTrabalho as MeuTrabalhoData, ItemTrabalho } from "@/services/diarioService";

const ALTURA_PADRAO = 320;
const ALTURA_MINIMA = 120;

function chaveAltura(workspaceId: string): string {
  return `meu-trabalho-altura-${workspaceId}`;
}

function formatarData(iso: string): string {
  const hoje = new Date().toISOString().slice(0, 10);
  const ontem = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  if (iso === hoje) return "Hoje";
  if (iso === ontem) return "Ontem";
  return new Date(`${iso}T00:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function ItemLinha({ item }: { item: ItemTrabalho }) {
  const conteudo = (
    <div className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 text-sm hover:bg-accent">
      <div className="min-w-0 truncate">
        <span>{item.titulo}</span>
        {item.subtitulo && <span className="ml-1.5 text-xs text-muted-foreground">· {item.subtitulo}</span>}
      </div>
      {item.dataVencimento && <span className="shrink-0 text-xs text-amber-600">{formatarData(item.dataVencimento)}</span>}
    </div>
  );
  return item.href ? (
    <Link href={item.href} className="block">
      {conteudo}
    </Link>
  ) : (
    conteudo
  );
}

function Grupo({ titulo, itens, defaultAberto }: { titulo: string; itens: ItemTrabalho[]; defaultAberto: boolean }) {
  const [aberto, setAberto] = useState(defaultAberto);
  return (
    <div>
      <button type="button" onClick={() => setAberto((v) => !v)} className="flex w-full items-center gap-1.5 px-1 py-2 text-left text-sm font-medium">
        {aberto ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
        {titulo}
        <span className="text-muted-foreground">{itens.length}</span>
      </button>
      {aberto && itens.length > 0 && <ul className="pb-1">{itens.map((item) => <ItemLinha key={`${item.tipo}-${item.id}`} item={item} />)}</ul>}
    </div>
  );
}

export function MeuTrabalho({ workspaceId, dados }: { workspaceId: string; dados: MeuTrabalhoData }) {
  const [altura, setAltura] = useState(ALTURA_PADRAO);

  useEffect(() => {
    try {
      const bruto = localStorage.getItem(chaveAltura(workspaceId));
      if (bruto) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- leitura de localStorage só no cliente, roda 1x
        setAltura(Math.max(ALTURA_MINIMA, Number(bruto)));
      }
    } catch {
      // sem persistência local se localStorage falhar
    }
  }, [workspaceId]);

  const onResize = useCallback(
    (deltaY: number) => {
      setAltura((prev) => {
        const proximo = Math.max(ALTURA_MINIMA, prev + deltaY);
        try {
          localStorage.setItem(chaveAltura(workspaceId), String(proximo));
        } catch {
          // sem persistência local se localStorage falhar
        }
        return proximo;
      });
    },
    [workspaceId]
  );

  return (
    <div className="rounded-lg border">
      <div className="border-b px-4 py-3">
        <h2 className="text-sm font-semibold">Meu trabalho</h2>
      </div>

      <Tabs defaultValue="pendente" className="px-4 pt-2">
        <TabsList variant="line">
          <TabsTrigger value="pendente">Pendente</TabsTrigger>
          <TabsTrigger value="feito">Feito</TabsTrigger>
        </TabsList>

        <TabsContent value="pendente" style={{ height: altura }} className="overflow-y-auto pb-2">
          <Grupo titulo="Hoje" itens={dados.pendente.hoje} defaultAberto={dados.pendente.hoje.length > 0} />
          <Grupo titulo="Em atraso" itens={dados.pendente.emAtraso} defaultAberto={dados.pendente.emAtraso.length > 0} />
          <Grupo titulo="Próximo" itens={dados.pendente.proximo} defaultAberto={dados.pendente.proximo.length > 0} />
          <Grupo titulo="Não programado" itens={dados.pendente.naoProgramado} defaultAberto={false} />
        </TabsContent>

        <TabsContent value="feito" style={{ height: altura }} className="overflow-y-auto pb-2">
          {dados.feito.length === 0 ? (
            <p className="px-1 py-3 text-sm text-muted-foreground">Nada concluído ainda.</p>
          ) : (
            <ul>
              {dados.feito.map((item) => (
                <ItemLinha key={`${item.tipo}-${item.id}`} item={item} />
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>

      <ResizeHandleVertical onResize={onResize} />
    </div>
  );
}
