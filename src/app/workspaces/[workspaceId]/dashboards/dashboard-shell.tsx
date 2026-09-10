"use client";

import { useCallback, useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { ChevronDown, ChevronUp, LayoutGrid, Bookmark, Trash2, Check } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import {
  BLOCO_LABEL,
  LAYOUT_PADRAO,
  normalizarLayout,
  type BlocoDashboard,
  type LayoutDashboard,
  type OpcoesFiltroDashboard,
  type DashboardVisao,
} from "@/lib/dashboardFiltros";
import { DashboardFiltros } from "./dashboard-filtros";
import { salvarVisaoDashboardAction, excluirVisaoDashboardAction } from "./actions";

const chave = (workspaceId: string) => `dashboard-layout-${workspaceId}`;

export function DashboardShell({
  workspaceId,
  opcoes,
  visoes,
  blocos,
}: {
  workspaceId: string;
  opcoes: OpcoesFiltroDashboard;
  visoes: DashboardVisao[];
  blocos: Record<BlocoDashboard, ReactNode>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [pending, startTransition] = useTransition();

  const [layout, setLayoutState] = useState<LayoutDashboard>(LAYOUT_PADRAO);
  const layoutRef = useRef(layout);

  const setLayout = useCallback(
    (novo: LayoutDashboard) => {
      layoutRef.current = novo;
      setLayoutState(novo);
      try {
        localStorage.setItem(chave(workspaceId), JSON.stringify(novo));
      } catch {
        // sem persistência local se localStorage falhar
      }
    },
    [workspaceId]
  );

  // Layout de trabalho salvo no navegador (independente das visões nomeadas).
  useEffect(() => {
    try {
      const bruto = localStorage.getItem(chave(workspaceId));
      if (!bruto) return;
      const restaurado = normalizarLayout(JSON.parse(bruto));
      layoutRef.current = restaurado;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- leitura de localStorage só no cliente, roda 1x
      setLayoutState(restaurado);
    } catch {
      // ignora
    }
  }, [workspaceId]);

  function mover(idx: number, dir: -1 | 1) {
    const alvo = idx + dir;
    if (alvo < 0 || alvo >= layout.length) return;
    const copia = [...layout];
    [copia[idx], copia[alvo]] = [copia[alvo], copia[idx]];
    setLayout(copia);
  }

  function alternarVisivel(id: BlocoDashboard) {
    setLayout(layout.map((b) => (b.id === id ? { ...b, visivel: !b.visivel } : b)));
  }

  function filtrosAtuais(): Record<string, string> {
    return Object.fromEntries([...sp.entries()]);
  }

  function aplicarVisao(v: DashboardVisao) {
    setLayout(normalizarLayout(v.config.layout));
    const params = new URLSearchParams(v.config.filtros);
    startTransition(() => router.replace(`${pathname}?${params.toString()}`, { scroll: false }));
    toast(`Visão “${v.nome}” aplicada.`);
  }

  function salvarVisao() {
    const nome = window.prompt("Nome da visão:");
    if (!nome?.trim()) return;
    startTransition(async () => {
      const res = await salvarVisaoDashboardAction(workspaceId, nome, {
        layout: layoutRef.current,
        filtros: filtrosAtuais(),
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast(`Visão “${res.data.nome}” salva.`);
      router.refresh();
    });
  }

  function excluirVisao(v: DashboardVisao) {
    if (!window.confirm(`Excluir a visão “${v.nome}”?`)) return;
    startTransition(async () => {
      const res = await excluirVisaoDashboardAction(workspaceId, v.id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast(`Visão “${v.nome}” excluída.`);
      router.refresh();
    });
  }

  const visiveis = layout.filter((b) => b.visivel);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <DashboardFiltros opcoes={opcoes} />

        {/* Blocos */}
        <Popover>
          <PopoverTrigger
            render={<button type="button" className="flex h-9 items-center gap-1.5 rounded-md border px-3 text-sm hover:bg-accent" />}
          >
            <LayoutGrid className="size-3.5" />
            Blocos
            <ChevronDown className="size-3.5 text-muted-foreground" />
          </PopoverTrigger>
          <PopoverContent align="start" className="w-72 p-1">
            {layout.map((b, idx) => (
              <div key={b.id} className="flex items-center gap-1 rounded-md px-1.5 py-1 text-sm hover:bg-accent">
                <button
                  type="button"
                  onClick={() => alternarVisivel(b.id)}
                  className="flex flex-1 items-center gap-2 text-left"
                >
                  <span
                    className={
                      "flex size-4 shrink-0 items-center justify-center rounded border " +
                      (b.visivel ? "border-primary bg-primary text-primary-foreground" : "border-input")
                    }
                  >
                    {b.visivel && <Check className="size-3" />}
                  </span>
                  <span className={b.visivel ? "" : "text-muted-foreground"}>{BLOCO_LABEL[b.id]}</span>
                </button>
                <button
                  type="button"
                  onClick={() => mover(idx, -1)}
                  disabled={idx === 0}
                  className="rounded p-0.5 text-muted-foreground hover:bg-background hover:text-foreground disabled:opacity-30"
                  aria-label="Subir"
                >
                  <ChevronUp className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => mover(idx, 1)}
                  disabled={idx === layout.length - 1}
                  className="rounded p-0.5 text-muted-foreground hover:bg-background hover:text-foreground disabled:opacity-30"
                  aria-label="Descer"
                >
                  <ChevronDown className="size-4" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setLayout(LAYOUT_PADRAO.map((b) => ({ ...b })))}
              className="mt-1 w-full rounded-md px-2 py-1.5 text-left text-xs text-muted-foreground hover:bg-accent"
            >
              Restaurar padrão
            </button>
          </PopoverContent>
        </Popover>

        {/* Visões */}
        <Popover>
          <PopoverTrigger
            render={<button type="button" className="flex h-9 items-center gap-1.5 rounded-md border px-3 text-sm hover:bg-accent" />}
          >
            <Bookmark className="size-3.5" />
            Visões
            {visoes.length > 0 && <span className="text-xs text-muted-foreground">({visoes.length})</span>}
            <ChevronDown className="size-3.5 text-muted-foreground" />
          </PopoverTrigger>
          <PopoverContent align="start" className="w-72 p-1">
            {visoes.length === 0 && <p className="px-2 py-1.5 text-xs text-muted-foreground">Nenhuma visão salva ainda.</p>}
            {visoes.map((v) => (
              <div key={v.id} className="flex items-center gap-1 rounded-md px-1.5 py-1 text-sm hover:bg-accent">
                <button type="button" onClick={() => aplicarVisao(v)} className="flex-1 truncate text-left">
                  {v.nome}
                </button>
                <button
                  type="button"
                  onClick={() => excluirVisao(v)}
                  className="rounded p-0.5 text-muted-foreground hover:bg-background hover:text-destructive"
                  aria-label="Excluir visão"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={salvarVisao}
              className="mt-1 w-full rounded-md border-t px-2 py-1.5 text-left text-xs font-medium text-primary hover:bg-accent"
            >
              + Salvar visão atual
            </button>
          </PopoverContent>
        </Popover>

        {pending && <span className="text-xs text-muted-foreground">…</span>}
      </div>

      {visiveis.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum bloco visível — ative algum em “Blocos”.</p>
      ) : (
        <div className="space-y-6">
          {visiveis.map((b) => (
            <div key={b.id}>{blocos[b.id]}</div>
          ))}
        </div>
      )}
    </div>
  );
}
