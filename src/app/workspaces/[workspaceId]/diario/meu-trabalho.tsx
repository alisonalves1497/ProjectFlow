"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight, ListTodo, FileText, ClipboardCheck, CircleCheck } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ResizeHandleVertical } from "@/components/ui/resize-handle-vertical";
import type { MeuTrabalho as MeuTrabalhoData, ItemTrabalho } from "@/services/diarioService";

const ALTURA_PADRAO = 340;
const ALTURA_MINIMA = 120;

type Tom = "atraso" | "hoje" | "proximo" | "neutro";

const TOM_DATA: Record<Tom, string> = {
  atraso: "text-destructive font-medium",
  hoje: "text-amber-600 dark:text-amber-400 font-medium",
  proximo: "text-primary/70",
  neutro: "text-muted-foreground",
};

const TOM_TITULO: Record<Tom, string> = {
  atraso: "text-destructive",
  hoje: "text-amber-600 dark:text-amber-400",
  proximo: "text-foreground",
  neutro: "text-foreground",
};

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

function ItemLinha({ item, tom }: { item: ItemTrabalho; tom: Tom }) {
  const conteudo = (
    <div className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 text-sm hover:bg-accent">
      <div className="flex min-w-0 items-center gap-2">
        {item.tipo === "documento" ? (
          <FileText className="size-3.5 shrink-0 text-primary/60" />
        ) : (
          <ClipboardCheck className="size-3.5 shrink-0 text-primary/60" />
        )}
        <span className="min-w-0 truncate">
          <span>{item.titulo}</span>
          {item.subtitulo && <span className="ml-1.5 text-xs text-muted-foreground">· {item.subtitulo}</span>}
        </span>
      </div>
      {item.dataVencimento && <span className={`shrink-0 text-xs ${TOM_DATA[tom]}`}>{formatarData(item.dataVencimento)}</span>}
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

function Grupo({ titulo, itens, tom, defaultAberto }: { titulo: string; itens: ItemTrabalho[]; tom: Tom; defaultAberto: boolean }) {
  const [aberto, setAberto] = useState(defaultAberto);
  return (
    <div>
      <button type="button" onClick={() => setAberto((v) => !v)} className="flex w-full items-center gap-1.5 px-1 py-2 text-left text-sm font-medium">
        {aberto ? <ChevronDown className="size-3.5 text-muted-foreground" /> : <ChevronRight className="size-3.5 text-muted-foreground" />}
        <span className={TOM_TITULO[tom]}>{titulo}</span>
        <span className={itens.length > 0 && tom === "atraso" ? "font-semibold text-destructive" : "text-muted-foreground"}>{itens.length}</span>
      </button>
      {aberto && itens.length > 0 && (
        <ul className="pb-1">
          {itens.map((item) => (
            <ItemLinha key={`${item.tipo}-${item.id}`} item={item} tom={tom} />
          ))}
        </ul>
      )}
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
    <Card className="gap-0 pb-0">
      <CardHeader className="border-b pb-3">
        <div className="flex items-center gap-2">
          <ListTodo className="size-4 text-primary" />
          <CardTitle>Meu trabalho</CardTitle>
        </div>
      </CardHeader>

      <CardContent className="pt-2">
        <Tabs defaultValue="pendente">
          <TabsList variant="line">
            <TabsTrigger value="pendente">Pendente</TabsTrigger>
            <TabsTrigger value="feito">Feito</TabsTrigger>
          </TabsList>

          <TabsContent value="pendente" style={{ height: altura }} className="overflow-y-auto pb-2">
            <Grupo titulo="Hoje" itens={dados.pendente.hoje} tom="hoje" defaultAberto={dados.pendente.hoje.length > 0} />
            <Grupo titulo="Em atraso" itens={dados.pendente.emAtraso} tom="atraso" defaultAberto={dados.pendente.emAtraso.length > 0} />
            <Grupo titulo="Próximo" itens={dados.pendente.proximo} tom="proximo" defaultAberto={dados.pendente.proximo.length > 0} />
            <Grupo titulo="Não programado" itens={dados.pendente.naoProgramado} tom="neutro" defaultAberto={false} />
          </TabsContent>

          <TabsContent value="feito" style={{ height: altura }} className="overflow-y-auto pb-2">
            {dados.feito.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center text-sm text-muted-foreground">
                <CircleCheck className="size-6 text-primary/30" />
                Nada concluído ainda.
              </div>
            ) : (
              <ul>
                {dados.feito.map((item) => (
                  <ItemLinha key={`${item.tipo}-${item.id}`} item={item} tom="neutro" />
                ))}
              </ul>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>

      <ResizeHandleVertical onResize={onResize} />
    </Card>
  );
}
