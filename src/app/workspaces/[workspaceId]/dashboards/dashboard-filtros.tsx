"use client";

import { useCallback, useMemo, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { STATUS_LABELS, type StatusDocumento } from "@/lib/statusGraph";
import { SEM_RESPONSAVEL, type OpcoesFiltroDashboard } from "@/lib/dashboardFiltros";

// Ordem em que os status aparecem no filtro (mesma do fluxo real).
const STATUS_ORDEM: StatusDocumento[] = [
  "previsto", "em_rascunho", "em_elaboracao", "devolvido_correcao", "em_revisao_interna",
  "aprovacao_lider_tecnico", "aguardando_envio_ged", "em_analise_cliente", "aprovado",
  "aprovado_com_comentarios", "liberado_para_construcao", "reprovado", "devolvido_pelo_cliente",
  "informativo", "cancelado",
];

type Opcao = { valor: string; rotulo: string };

function MultiSelect({
  titulo,
  opcoes,
  selecionados,
  onChange,
}: {
  titulo: string;
  opcoes: Opcao[];
  selecionados: string[];
  onChange: (novos: string[]) => void;
}) {
  const set = new Set(selecionados);
  const alternar = (v: string) => {
    const proximo = new Set(set);
    if (proximo.has(v)) proximo.delete(v);
    else proximo.add(v);
    onChange([...proximo]);
  };
  return (
    <Popover>
      <PopoverTrigger
        render={
          <button
            type="button"
            className={cn(
              "flex h-9 items-center gap-1.5 rounded-md border px-3 text-sm",
              set.size > 0 ? "border-primary/50 bg-primary/5 font-medium" : "hover:bg-accent"
            )}
          />
        }
      >
        {titulo}
        {set.size > 0 && <span className="rounded-full bg-primary px-1.5 text-xs text-primary-foreground">{set.size}</span>}
        <ChevronDown className="size-3.5 text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent align="start" className="max-h-80 w-64 overflow-y-auto p-1">
        {opcoes.length === 0 && <p className="p-2 text-xs text-muted-foreground">Nada disponível.</p>}
        {opcoes.map((o) => (
          <label key={o.valor} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent">
            <input type="checkbox" checked={set.has(o.valor)} onChange={() => alternar(o.valor)} className="size-3.5" />
            <span className="truncate">{o.rotulo}</span>
          </label>
        ))}
        {set.size > 0 && (
          <button
            type="button"
            onClick={() => onChange([])}
            className="mt-1 w-full rounded-md px-2 py-1.5 text-left text-xs text-muted-foreground hover:bg-accent"
          >
            Limpar {titulo.toLowerCase()}
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}

export function DashboardFiltros({ opcoes }: { opcoes: OpcoesFiltroDashboard }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [pending, startTransition] = useTransition();

  const ler = useCallback((chave: string) => sp.get(chave)?.split(",").filter(Boolean) ?? [], [sp]);

  const escrever = useCallback(
    (mudancas: Record<string, string | string[] | null>) => {
      const params = new URLSearchParams(sp.toString());
      for (const [chave, valor] of Object.entries(mudancas)) {
        const str = Array.isArray(valor) ? valor.join(",") : valor;
        if (!str) params.delete(chave);
        else params.set(chave, str);
      }
      startTransition(() => router.replace(`${pathname}?${params.toString()}`, { scroll: false }));
    },
    [router, pathname, sp]
  );

  const obraSel = ler("obra");
  const discSel = ler("disc");
  const respSel = ler("resp");
  const statusSel = ler("status");
  const de = sp.get("de") ?? "";
  const ate = sp.get("ate") ?? "";

  const temFiltro = obraSel.length || discSel.length || respSel.length || statusSel.length || de || ate;

  const opcoesResp = useMemo<Opcao[]>(
    () => [
      { valor: SEM_RESPONSAVEL, rotulo: "— Sem responsável —" },
      ...opcoes.responsaveis.map((r) => ({ valor: r.id, rotulo: r.nome })),
    ],
    [opcoes.responsaveis]
  );

  return (
    <div className="mb-6 flex flex-wrap items-center gap-2">
      <MultiSelect
        titulo="Obra"
        opcoes={opcoes.obras.map((o) => ({ valor: o.id, rotulo: o.nome }))}
        selecionados={obraSel}
        onChange={(v) => escrever({ obra: v })}
      />
      <MultiSelect
        titulo="Disciplina"
        opcoes={opcoes.disciplinas.map((d) => ({ valor: d, rotulo: d }))}
        selecionados={discSel}
        onChange={(v) => escrever({ disc: v })}
      />
      <MultiSelect titulo="Responsável" opcoes={opcoesResp} selecionados={respSel} onChange={(v) => escrever({ resp: v })} />
      <MultiSelect
        titulo="Status"
        opcoes={STATUS_ORDEM.map((s) => ({ valor: s, rotulo: STATUS_LABELS[s] }))}
        selecionados={statusSel}
        onChange={(v) => escrever({ status: v })}
      />

      <div className="flex items-center gap-1.5 text-sm">
        <span className="text-muted-foreground">Prazo de</span>
        <input
          type="date"
          value={de}
          onChange={(e) => escrever({ de: e.target.value || null })}
          className="h-9 rounded-md border bg-transparent px-2"
        />
        <span className="text-muted-foreground">até</span>
        <input
          type="date"
          value={ate}
          onChange={(e) => escrever({ ate: e.target.value || null })}
          className="h-9 rounded-md border bg-transparent px-2"
        />
      </div>

      {temFiltro ? (
        <button
          type="button"
          onClick={() => escrever({ obra: null, disc: null, resp: null, status: null, de: null, ate: null })}
          className="flex h-9 items-center gap-1 rounded-md px-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <X className="size-3.5" />
          Limpar
        </button>
      ) : null}

      {pending && <span className="text-xs text-muted-foreground">atualizando…</span>}
    </div>
  );
}
