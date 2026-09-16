"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Check, Circle, Trash2, Settings2 } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { ResizeHandleVertical } from "@/components/ui/resize-handle-vertical";
import { criarTarefaAction, atualizarTarefaAction, excluirTarefaAction } from "./actions";
import type { TarefaPessoal, PatchTarefaPessoal } from "@/services/diarioService";

const ALTURA_PADRAO = 260;
const ALTURA_MINIMA = 100;

type ColunaId = "projeto" | "dataVencimento" | "prioridade" | "dataCriada" | "dataConclusao" | "dataInicial" | "estimativa" | "tempoRastreado";

const COLUNAS: { id: ColunaId; label: string }[] = [
  { id: "projeto", label: "Projeto" },
  { id: "dataVencimento", label: "Data de vencimento" },
  { id: "prioridade", label: "Prioridade" },
  { id: "dataCriada", label: "Data criada" },
  { id: "dataConclusao", label: "Data de conclusão" },
  { id: "dataInicial", label: "Data inicial" },
  { id: "estimativa", label: "Estimativa de tempo" },
  { id: "tempoRastreado", label: "Tempo rastreado" },
];

const COLUNAS_PADRAO: ColunaId[] = ["dataVencimento", "prioridade", "dataCriada"];

const PRIORIDADES = [
  { value: "", label: "Sem prioridade" },
  { value: "urgente", label: "Urgente" },
  { value: "alta", label: "Alta" },
  { value: "normal", label: "Normal" },
  { value: "baixa", label: "Baixa" },
] as const;

function chaveColunas(workspaceId: string): string {
  return `lista-pessoal-colunas-${workspaceId}`;
}
function chaveAltura(workspaceId: string): string {
  return `lista-pessoal-altura-${workspaceId}`;
}

function formatarDataCurta(valor: string | Date | null): string {
  if (!valor) return "";
  const iso = typeof valor === "string" ? valor : valor.toISOString().slice(0, 10);
  return new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function minutosParaHoras(minutos: number | null): string {
  if (minutos === null) return "";
  return String(Math.round((minutos / 60) * 10) / 10);
}

export function ListaPessoal({
  workspaceId,
  tarefasIniciais,
  projetos,
}: {
  workspaceId: string;
  tarefasIniciais: TarefaPessoal[];
  projetos: { id: string; name: string }[];
}) {
  const [tarefas, setTarefas] = useState(tarefasIniciais);
  const [colunas, setColunas] = useState<ColunaId[]>(COLUNAS_PADRAO);
  const [altura, setAltura] = useState(ALTURA_PADRAO);
  const [novaTarefa, setNovaTarefa] = useState("");
  const criandoRef = useRef(false);

  useEffect(() => {
    try {
      const brutoColunas = localStorage.getItem(chaveColunas(workspaceId));
      if (brutoColunas) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- leitura de localStorage só no cliente, roda 1x
        setColunas(JSON.parse(brutoColunas));
      }
      const brutoAltura = localStorage.getItem(chaveAltura(workspaceId));
      if (brutoAltura) {
        setAltura(Math.max(ALTURA_MINIMA, Number(brutoAltura)));
      }
    } catch {
      // sem persistência local se localStorage falhar
    }
  }, [workspaceId]);

  function alternarColuna(id: ColunaId) {
    setColunas((prev) => {
      const proximo = prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id];
      try {
        localStorage.setItem(chaveColunas(workspaceId), JSON.stringify(proximo));
      } catch {
        // sem persistência local se localStorage falhar
      }
      return proximo;
    });
  }

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

  async function alterar(id: string, patch: PatchTarefaPessoal, tarefaOtimista: Partial<TarefaPessoal>) {
    const original = tarefas.find((t) => t.id === id);
    setTarefas((prev) => prev.map((t) => (t.id === id ? { ...t, ...tarefaOtimista } : t)));

    const res = await atualizarTarefaAction(workspaceId, id, patch);
    if (!res.ok) {
      toast.error(res.error);
      if (original) setTarefas((prev) => prev.map((t) => (t.id === id ? original : t)));
    }
  }

  async function excluir(id: string) {
    const original = tarefas;
    setTarefas((prev) => prev.filter((t) => t.id !== id));

    const res = await excluirTarefaAction(workspaceId, id);
    if (!res.ok) {
      toast.error(res.error);
      setTarefas(original);
    }
  }

  async function adicionar() {
    const nome = novaTarefa.trim();
    if (!nome || criandoRef.current) return;
    criandoRef.current = true;
    setNovaTarefa("");

    const res = await criarTarefaAction(workspaceId, nome);
    criandoRef.current = false;
    if (!res.ok) {
      toast.error(res.error);
      setNovaTarefa(nome);
      return;
    }
    setTarefas((prev) => [res.tarefa, ...prev]);
  }

  return (
    <div className="rounded-lg border">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h2 className="text-sm font-semibold">Lista pessoal</h2>
        <Popover>
          <PopoverTrigger render={<button type="button" className="flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs hover:bg-accent" />}>
            <Settings2 className="size-3.5" />
            Colunas
          </PopoverTrigger>
          <PopoverContent align="end" className="w-64 p-1">
            {COLUNAS.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => alternarColuna(c.id)}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
              >
                <span
                  className={
                    "flex size-4 shrink-0 items-center justify-center rounded border " +
                    (colunas.includes(c.id) ? "border-primary bg-primary text-primary-foreground" : "border-input")
                  }
                >
                  {colunas.includes(c.id) && <Check className="size-3" />}
                </span>
                {c.label}
              </button>
            ))}
          </PopoverContent>
        </Popover>
      </div>

      <div style={{ height: altura }} className="overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-background">
            <tr className="border-b text-xs text-muted-foreground">
              <th className="w-8"></th>
              <th className="px-2 py-1.5 text-left font-medium">Nome da tarefa</th>
              {colunas.includes("projeto") && <th className="px-2 py-1.5 text-left font-medium">Projeto</th>}
              {colunas.includes("dataVencimento") && <th className="px-2 py-1.5 text-left font-medium">Vencimento</th>}
              {colunas.includes("prioridade") && <th className="px-2 py-1.5 text-left font-medium">Prioridade</th>}
              {colunas.includes("dataCriada") && <th className="px-2 py-1.5 text-left font-medium">Criada</th>}
              {colunas.includes("dataConclusao") && <th className="px-2 py-1.5 text-left font-medium">Conclusão</th>}
              {colunas.includes("dataInicial") && <th className="px-2 py-1.5 text-left font-medium">Início</th>}
              {colunas.includes("estimativa") && <th className="px-2 py-1.5 text-left font-medium">Estimativa (h)</th>}
              {colunas.includes("tempoRastreado") && <th className="px-2 py-1.5 text-left font-medium">Tempo (h)</th>}
              <th className="w-8"></th>
            </tr>
          </thead>
          <tbody>
            {tarefas.map((t) => (
              <tr key={t.id} className="group/linha border-b last:border-b-0">
                <td className="px-2 py-1.5">
                  <button
                    type="button"
                    onClick={() => alterar(t.id, { status: t.status === "feito" ? "pendente" : "feito" }, { status: t.status === "feito" ? "pendente" : "feito" })}
                    title={t.status === "feito" ? "Marcar como pendente" : "Marcar como feito"}
                    className="text-muted-foreground hover:text-primary"
                  >
                    {t.status === "feito" ? <Check className="size-4 text-primary" /> : <Circle className="size-4" />}
                  </button>
                </td>
                <td className="px-2 py-1.5">
                  <input
                    defaultValue={t.nome}
                    onBlur={(e) => {
                      if (e.target.value.trim() && e.target.value !== t.nome) alterar(t.id, { nome: e.target.value }, { nome: e.target.value.trim() });
                    }}
                    onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                    className={"w-full bg-transparent outline-none " + (t.status === "feito" ? "text-muted-foreground line-through" : "")}
                  />
                </td>
                {colunas.includes("projeto") && (
                  <td className="px-2 py-1.5">
                    <select
                      defaultValue={t.projetoId ?? ""}
                      onChange={(e) => {
                        const projetoId = e.target.value || null;
                        const projeto = projetos.find((p) => p.id === projetoId);
                        alterar(t.id, { projetoId }, { projetoId, projetoNome: projeto?.name ?? null });
                      }}
                      className="w-full bg-transparent text-xs outline-none"
                    >
                      <option value="">—</option>
                      {projetos.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </td>
                )}
                {colunas.includes("dataVencimento") && (
                  <td className="px-2 py-1.5">
                    <input
                      type="date"
                      defaultValue={t.dataVencimento ?? ""}
                      onChange={(e) => alterar(t.id, { dataVencimento: e.target.value || null }, { dataVencimento: e.target.value || null })}
                      className="bg-transparent text-xs outline-none"
                    />
                  </td>
                )}
                {colunas.includes("prioridade") && (
                  <td className="px-2 py-1.5">
                    <select
                      defaultValue={t.prioridade ?? ""}
                      onChange={(e) => {
                        const prioridade = (e.target.value || null) as PatchTarefaPessoal["prioridade"];
                        alterar(t.id, { prioridade }, { prioridade });
                      }}
                      className="bg-transparent text-xs outline-none"
                    >
                      {PRIORIDADES.map((p) => (
                        <option key={p.value} value={p.value}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                  </td>
                )}
                {colunas.includes("dataCriada") && <td className="px-2 py-1.5 text-xs text-muted-foreground">{formatarDataCurta(t.createdAt)}</td>}
                {colunas.includes("dataConclusao") && (
                  <td className="px-2 py-1.5 text-xs text-muted-foreground">{t.concluidaEm ? formatarDataCurta(t.concluidaEm) : "—"}</td>
                )}
                {colunas.includes("dataInicial") && (
                  <td className="px-2 py-1.5">
                    <input
                      type="date"
                      defaultValue={t.dataInicial ?? ""}
                      onChange={(e) => alterar(t.id, { dataInicial: e.target.value || null }, { dataInicial: e.target.value || null })}
                      className="bg-transparent text-xs outline-none"
                    />
                  </td>
                )}
                {colunas.includes("estimativa") && (
                  <td className="px-2 py-1.5">
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      defaultValue={minutosParaHoras(t.estimativaMinutos)}
                      onBlur={(e) => {
                        const horas = e.target.value === "" ? null : Number(e.target.value);
                        const minutos = horas === null ? null : Math.round(horas * 60);
                        alterar(t.id, { estimativaMinutos: minutos }, { estimativaMinutos: minutos });
                      }}
                      className="w-16 bg-transparent text-xs outline-none"
                    />
                  </td>
                )}
                {colunas.includes("tempoRastreado") && (
                  <td className="px-2 py-1.5">
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      defaultValue={minutosParaHoras(t.tempoRastreadoMinutos)}
                      onBlur={(e) => {
                        const horas = e.target.value === "" ? null : Number(e.target.value);
                        const minutos = horas === null ? null : Math.round(horas * 60);
                        alterar(t.id, { tempoRastreadoMinutos: minutos }, { tempoRastreadoMinutos: minutos });
                      }}
                      className="w-16 bg-transparent text-xs outline-none"
                    />
                  </td>
                )}
                <td className="px-2 py-1.5">
                  <button
                    type="button"
                    onClick={() => excluir(t.id)}
                    className="text-muted-foreground opacity-0 hover:text-destructive group-hover/linha:opacity-100"
                    title="Excluir"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </td>
              </tr>
            ))}
            <tr>
              <td></td>
              <td className="px-2 py-1.5" colSpan={colunas.length + 2}>
                <input
                  value={novaTarefa}
                  onChange={(e) => setNovaTarefa(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && adicionar()}
                  onBlur={adicionar}
                  placeholder="+ Adicionar tarefa"
                  className="w-full bg-transparent text-sm text-muted-foreground outline-none placeholder:text-muted-foreground"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <ResizeHandleVertical onResize={onResize} />
    </div>
  );
}
