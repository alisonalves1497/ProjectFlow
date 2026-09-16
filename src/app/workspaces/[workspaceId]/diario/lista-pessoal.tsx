"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Check, Circle, CircleCheck, Trash2, Settings2, ClipboardList, Plus, Flag, FileText } from "lucide-react";
import { Card, CardHeader, CardTitle, CardAction, CardContent } from "@/components/ui/card";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { ResizeHandleVertical } from "@/components/ui/resize-handle-vertical";
import { ResizeHandle } from "@/components/ui/resize-handle";
import { DatePickerField } from "@/components/ui/date-picker-field";
import { SelectPopoverField } from "@/components/ui/select-popover-field";
import { criarTarefaAction, atualizarTarefaAction, excluirTarefaAction } from "./actions";
import type { TarefaPessoal, PatchTarefaPessoal } from "@/services/diarioService";

const ALTURA_PADRAO = 260;
const ALTURA_MINIMA = 100;
const LARGURA_MINIMA = 60;

type ColunaId = "projeto" | "documento" | "dataVencimento" | "prioridade" | "dataConclusao" | "dataInicial" | "estimativa" | "tempoRastreado";

const COLUNAS: { id: ColunaId; label: string }[] = [
  { id: "projeto", label: "Projeto" },
  { id: "documento", label: "Documento" },
  { id: "dataVencimento", label: "Data de vencimento" },
  { id: "prioridade", label: "Prioridade" },
  { id: "dataConclusao", label: "Data de conclusão" },
  { id: "dataInicial", label: "Data inicial" },
  { id: "estimativa", label: "Estimativa de tempo" },
  { id: "tempoRastreado", label: "Tempo rastreado" },
];

const COLUNAS_PADRAO: ColunaId[] = ["projeto", "documento", "dataVencimento", "prioridade"];

// Nome da tarefa tem largura própria generosa; as demais colunas visíveis, enquanto
// ninguém arrastar nada, dividem igualmente o que sobra da tela (table-fixed distribui
// automaticamente entre colunas sem width explícito) — só ganham um valor fixo em px aqui
// (`larguras`) a partir do momento que a pessoa arrasta a borda de alguma.
const LARGURA_NOME = 260;

type PrioridadeValor = "urgente" | "alta" | "normal" | "baixa";

const PRIORIDADES: { value: PrioridadeValor; label: string; cor: string }[] = [
  { value: "urgente", label: "Urgente", cor: "text-red-500" },
  { value: "alta", label: "Alta", cor: "text-amber-500" },
  { value: "normal", label: "Normal", cor: "text-blue-500" },
  { value: "baixa", label: "Baixa", cor: "text-muted-foreground" },
];

function chaveColunas(workspaceId: string): string {
  return `lista-pessoal-colunas-${workspaceId}`;
}
function chaveAltura(workspaceId: string): string {
  return `lista-pessoal-altura-${workspaceId}`;
}
function chaveLarguras(workspaceId: string): string {
  return `lista-pessoal-larguras-${workspaceId}`;
}

function minutosParaHoras(minutos: number | null): string {
  if (minutos === null) return "";
  return String(Math.round((minutos / 60) * 10) / 10);
}

function paraDataISO(valor: Date | string | null): string | null {
  if (!valor) return null;
  const iso = typeof valor === "string" ? valor : valor.toISOString();
  return iso.slice(0, 10);
}

function PrioridadeCampo({ valor, onChange }: { valor: PrioridadeValor | null; onChange: (v: PrioridadeValor | null) => void }) {
  const atual = PRIORIDADES.find((p) => p.value === valor);
  return (
    <SelectPopoverField
      value={valor}
      onChange={(v) => onChange(v as PrioridadeValor | null)}
      width="w-40"
      triggerClassName="w-fit px-1.5"
      triggerContent={<Flag className={`size-3.5 ${atual?.cor ?? ""}`} fill={atual ? "currentColor" : "none"} />}
      options={PRIORIDADES.map((p) => ({
        value: p.value,
        label: p.label,
        icon: <Flag className={`size-3.5 ${p.cor}`} fill="currentColor" />,
      }))}
    />
  );
}

export function ListaPessoal({
  workspaceId,
  tarefasIniciais,
  projetos,
  documentosAtribuidos,
}: {
  workspaceId: string;
  tarefasIniciais: TarefaPessoal[];
  projetos: { id: string; name: string }[];
  documentosAtribuidos: { id: string; codigo: string; projetoId: string }[];
}) {
  const [tarefas, setTarefas] = useState(tarefasIniciais);
  const [colunas, setColunas] = useState<ColunaId[]>(COLUNAS_PADRAO);
  const [altura, setAltura] = useState(ALTURA_PADRAO);
  const [larguras, setLarguras] = useState<Partial<Record<ColunaId, number>>>({});
  const [novaTarefa, setNovaTarefa] = useState("");
  const criandoRef = useRef(false);
  const thRefs = useRef<Partial<Record<ColunaId, HTMLTableCellElement>>>({});

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
      const brutoLarguras = localStorage.getItem(chaveLarguras(workspaceId));
      if (brutoLarguras) {
        setLarguras((prev) => ({ ...prev, ...JSON.parse(brutoLarguras) }));
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

  // Alça na borda ESQUERDA da coluna — arrastar pra direita empurra essa borda pra dentro e
  // ela encolhe, igual o mesmo esquema já usado em Meus Documentos/Lista de Documentos.
  // Enquanto a coluna nunca foi arrastada ela não tem largura própria (`larguras[coluna]`
  // indefinido) — o primeiro arrasto usa a largura atual renderizada (medida via ref) como
  // ponto de partida, "congelando" a coluna num valor fixo a partir daí.
  function redimensionar(coluna: ColunaId, deltaX: number) {
    setLarguras((prev) => {
      const atual = prev[coluna] ?? thRefs.current[coluna]?.getBoundingClientRect().width ?? 120;
      const proximo = { ...prev, [coluna]: Math.max(LARGURA_MINIMA, atual - deltaX) };
      try {
        localStorage.setItem(chaveLarguras(workspaceId), JSON.stringify(proximo));
      } catch {
        // sem persistência local se localStorage falhar
      }
      return proximo;
    });
  }

  const onResizeAltura = useCallback(
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

  const documentosPorProjeto = useMemo(() => {
    const mapa = new Map<string, { id: string; codigo: string }[]>();
    for (const d of documentosAtribuidos) {
      if (!mapa.has(d.projetoId)) mapa.set(d.projetoId, []);
      mapa.get(d.projetoId)!.push({ id: d.id, codigo: d.codigo });
    }
    return mapa;
  }, [documentosAtribuidos]);

  return (
    <Card className="gap-0 pb-0">
      <CardHeader className="border-b pb-3">
        <div className="flex items-center gap-2">
          <ClipboardList className="size-4 text-primary" />
          <CardTitle>Lista pessoal</CardTitle>
        </div>
        <CardAction>
          <Popover>
            <PopoverTrigger
              render={<button type="button" className="flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs hover:bg-accent" />}
            >
              <Settings2 className="size-3.5" />
              Colunas
            </PopoverTrigger>
            <PopoverContent align="end" className="w-64 p-1">
              {COLUNAS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => alternarColuna(c.id)}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-sm hover:bg-accent"
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
        </CardAction>
      </CardHeader>

      <CardContent style={{ height: altura }} className="overflow-auto px-0 pt-2">
        <table className="w-full table-fixed text-sm">
          <thead className="sticky top-0 bg-card">
            <tr className="border-b text-xs text-muted-foreground">
              <th className="w-8"></th>
              <th className="overflow-hidden px-2 py-1 text-left font-medium text-ellipsis whitespace-nowrap" style={{ width: LARGURA_NOME }}>
                Nome da tarefa
              </th>
              {/* Sempre na ordem canônica de COLUNAS (não na ordem de `colunas`, que é só o
                  conjunto ativado/desativado) — o corpo da tabela abaixo também renderiza
                  cada coluna nessa mesma ordem fixa, então cabeçalho e célula precisam
                  concordar ou desalinham. Sem width explícito, table-fixed divide o que
                  sobra igualmente entre as colunas ainda não arrastadas. */}
              {COLUNAS.filter((c) => colunas.includes(c.id)).map((c) => (
                <th
                  key={c.id}
                  ref={(el) => {
                    thRefs.current[c.id] = el ?? undefined;
                  }}
                  className="relative overflow-hidden px-2 py-1 text-left font-medium text-ellipsis whitespace-nowrap"
                  style={larguras[c.id] ? { width: larguras[c.id] } : undefined}
                >
                  {c.label}
                  <ResizeHandle curto onResize={(d) => redimensionar(c.id, d)} />
                </th>
              ))}
              <th className="w-8"></th>
            </tr>
          </thead>
          <tbody>
            {tarefas.map((t) => {
              const documentosDoProjeto = t.projetoId ? (documentosPorProjeto.get(t.projetoId) ?? []) : [];
              return (
                <tr key={t.id} className="group/linha border-b last:border-b-0 hover:bg-accent/40">
                  <td className="px-2 py-1">
                    <button
                      type="button"
                      onClick={() =>
                        alterar(t.id, { status: t.status === "feito" ? "pendente" : "feito" }, { status: t.status === "feito" ? "pendente" : "feito" })
                      }
                      title={t.status === "feito" ? "Marcar como pendente" : "Marcar como feito"}
                      className="text-muted-foreground hover:text-primary"
                    >
                      {t.status === "feito" ? <CircleCheck className="size-4 text-green-600 dark:text-green-500" /> : <Circle className="size-4" />}
                    </button>
                  </td>
                  <td className="px-2 py-1">
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
                    <td className="px-2 py-1">
                      <SelectPopoverField
                        value={t.projetoId}
                        onChange={(projetoId) => {
                          const projeto = projetos.find((p) => p.id === projetoId);
                          // Trocar de projeto invalida o documento vinculado anterior (era de outro projeto).
                          alterar(
                            t.id,
                            { projetoId, documentoId: null },
                            { projetoId, projetoNome: projeto?.name ?? null, documentoId: null, documentoCodigo: null }
                          );
                        }}
                        triggerContent={<span className="min-w-0 truncate">{t.projetoNome ?? "—"}</span>}
                        options={projetos.map((p) => ({ value: p.id, label: p.name }))}
                      />
                    </td>
                  )}
                  {colunas.includes("documento") && (
                    <td className="px-2 py-1">
                      <SelectPopoverField
                        value={t.documentoId}
                        onChange={(documentoId) => {
                          const doc = documentosDoProjeto.find((d) => d.id === documentoId);
                          alterar(t.id, { documentoId }, { documentoId, documentoCodigo: doc?.codigo ?? null });
                        }}
                        disabled={!t.projetoId}
                        emptyMessage={t.projetoId ? "Nenhum documento atribuído a você nesse projeto." : "Escolha um projeto primeiro."}
                        triggerContent={
                          <span className="flex min-w-0 items-center gap-1">
                            <FileText className="size-3.5 shrink-0" />
                            <span className="min-w-0 truncate font-mono">{t.documentoCodigo ?? "—"}</span>
                          </span>
                        }
                        options={documentosDoProjeto.map((d) => ({ value: d.id, label: d.codigo }))}
                      />
                    </td>
                  )}
                  {colunas.includes("dataVencimento") && (
                    <td className="px-2 py-1">
                      <DatePickerField
                        value={t.dataVencimento}
                        onChange={(v) => alterar(t.id, { dataVencimento: v }, { dataVencimento: v })}
                      />
                    </td>
                  )}
                  {colunas.includes("prioridade") && (
                    <td className="px-2 py-1">
                      <PrioridadeCampo valor={t.prioridade} onChange={(v) => alterar(t.id, { prioridade: v }, { prioridade: v })} />
                    </td>
                  )}
                  {colunas.includes("dataConclusao") && (
                    <td className="px-2 py-1">
                      <DatePickerField
                        value={paraDataISO(t.concluidaEm)}
                        onChange={(v) =>
                          alterar(t.id, { concluidaEm: v }, { concluidaEm: v ? new Date(`${v}T12:00:00`) : null, status: v ? "feito" : "pendente" })
                        }
                      />
                    </td>
                  )}
                  {colunas.includes("dataInicial") && (
                    <td className="px-2 py-1">
                      <DatePickerField value={t.dataInicial} onChange={(v) => alterar(t.id, { dataInicial: v }, { dataInicial: v })} />
                    </td>
                  )}
                  {colunas.includes("estimativa") && (
                    <td className="px-2 py-1">
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
                    <td className="px-2 py-1">
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
                  <td className="px-2 py-1">
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
              );
            })}
            <tr>
              <td className="px-2 py-1 text-muted-foreground">
                <Plus className="size-3.5" />
              </td>
              <td className="px-2 py-1" colSpan={colunas.length + 2}>
                <input
                  value={novaTarefa}
                  onChange={(e) => setNovaTarefa(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && adicionar()}
                  onBlur={adicionar}
                  placeholder="Adicionar tarefa"
                  className="w-full bg-transparent text-sm text-muted-foreground outline-none placeholder:text-muted-foreground"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </CardContent>

      <ResizeHandleVertical onResize={onResizeAltura} />
    </Card>
  );
}
