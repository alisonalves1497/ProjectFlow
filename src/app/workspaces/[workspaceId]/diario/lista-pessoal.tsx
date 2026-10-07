"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Check, Circle, CircleCheck, Trash2, Settings2, ClipboardList, Plus, Flag, Pencil, Ban, Bold, User, Users } from "lucide-react";
import { Card, CardHeader, CardTitle, CardAction, CardContent } from "@/components/ui/card";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { ResizeHandleVertical } from "@/components/ui/resize-handle-vertical";
import { ResizeHandle } from "@/components/ui/resize-handle";
import { DatePickerField } from "@/components/ui/date-picker-field";
import { SelectPopoverField } from "@/components/ui/select-popover-field";
import { criarTarefaAction, atualizarTarefaAction, excluirTarefaAction, listarListaPessoalDeAction } from "./actions";
import type { TarefaPessoal, PatchTarefaPessoal } from "@/services/diarioService";

const ALTURA_PADRAO = 260;
const ALTURA_MINIMA = 100;
const LARGURA_MINIMA = 60;
const LARGURA_NOME_MINIMA = 160;
const LARGURA_FIXA = 32; // coluna do check e coluna da lixeira

type ColunaId =
  | "atribuido"
  | "status"
  | "obs"
  | "obsCoord"
  | "dataVencimento"
  | "prioridade"
  | "dataInicial"
  | "dataConclusao"
  | "estimativa"
  | "tempoRastreado";

const COLUNAS: { id: ColunaId; label: string }[] = [
  { id: "atribuido", label: "Atribuído" },
  { id: "status", label: "Status" },
  { id: "obs", label: "Obs" },
  { id: "obsCoord", label: "Obs Coord" },
  { id: "dataVencimento", label: "Data de vencimento" },
  { id: "prioridade", label: "Prioridade" },
  { id: "dataInicial", label: "Data inicial" },
  { id: "dataConclusao", label: "Data de conclusão" },
  { id: "estimativa", label: "Estimativa de tempo" },
  { id: "tempoRastreado", label: "Tempo rastreado" },
];

const COLUNAS_PADRAO: ColunaId[] = ["atribuido", "status", "obs", "obsCoord", "dataVencimento", "prioridade"];

// "Nome da tarefa" é a ÚNICA coluna sem largura própria (flexível — absorve o que sobra),
// igual a "Código/Descrição" em Meus Documentos/Lista de Documentos. Todas as outras colunas
// visíveis têm largura fixa desde o início (aqui embaixo). É importante que só uma coluna
// seja flexível: se mais de uma "auto-dividisse" o espaço, arrastar a borda de uma coluna
// faria váááARIAS outras mudarem de tamanho ao mesmo tempo, e a direção do arrasto parece
// errada/imprevisível. Com uma só, o efeito é sempre 1:1 com o mouse.
const LARGURAS_PADRAO: Record<ColunaId, number> = {
  atribuido: 110,
  status: 150,
  obs: 220,
  obsCoord: 220,
  dataVencimento: 120,
  prioridade: 90,
  dataInicial: 110,
  dataConclusao: 120,
  estimativa: 110,
  tempoRastreado: 110,
};

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

// Paleta fixa pra cor da letra/fundo — mesmo espírito do seletor de cores do Excel/Google
// Sheets, só que reduzido a um punhado de opções (mais que isso vira ruído numa tabela).
const PALETA_CORES = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#0ea5e9",
  "#6366f1",
  "#a855f7",
  "#ec4899",
  "#64748b",
  "#0f172a",
];

function SeletorCor({ valor, onChange }: { valor: string | null; onChange: (cor: string | null) => void }) {
  return (
    <div className="grid grid-cols-5 gap-1 p-1">
      {PALETA_CORES.map((cor) => (
        <button
          key={cor}
          type="button"
          onClick={() => onChange(cor)}
          title={cor}
          className={cn("size-5 rounded-full border", valor === cor && "ring-2 ring-primary ring-offset-1 ring-offset-popover")}
          style={{ backgroundColor: cor }}
        />
      ))}
      <button
        type="button"
        onClick={() => onChange(null)}
        title="Sem cor"
        className="flex size-5 items-center justify-center rounded-full border text-muted-foreground"
      >
        <Ban className="size-3" />
      </button>
    </div>
  );
}

export type FormatacaoTexto = { negrito: boolean; cor: string | null; fundo: string | null };

// Mini barra de formatação tipo Excel (N / cor da letra / cor de fundo) — aparece num lápis
// que só fica visível no hover da célula, pra não poluir a tabela quando não tá em uso.
function FormatacaoPopover({ formatacao, onChange }: { formatacao: FormatacaoTexto; onChange: (f: FormatacaoTexto) => void }) {
  const [open, setOpen] = useState(false);
  const temFormatacao = formatacao.negrito || formatacao.cor !== null || formatacao.fundo !== null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            title="Formatar texto"
            className={cn(
              "shrink-0 text-muted-foreground hover:text-foreground",
              temFormatacao ? "opacity-100" : "opacity-0 group-hover/linha:opacity-100"
            )}
          />
        }
      >
        <Pencil className="size-3" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-2">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onChange({ ...formatacao, negrito: !formatacao.negrito })}
            title="Negrito"
            className={cn(
              "flex size-6 items-center justify-center rounded-md border hover:bg-accent",
              formatacao.negrito && "border-primary bg-primary/10 text-primary"
            )}
          >
            <Bold className="size-3.5" />
          </button>
          <div>
            <p className="mb-1 text-[10px] text-muted-foreground">Cor da letra</p>
            <SeletorCor valor={formatacao.cor} onChange={(cor) => onChange({ ...formatacao, cor })} />
          </div>
          <div>
            <p className="mb-1 text-[10px] text-muted-foreground">Cor de fundo</p>
            <SeletorCor valor={formatacao.fundo} onChange={(fundo) => onChange({ ...formatacao, fundo })} />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Célula de texto livre (Status/Obs) — sem vínculo com nada, mesmo padrão inline do "Nome
// da tarefa": digita, sai do campo e salva. Além do texto, tem formatação tipo Excel
// (negrito/cor da letra/cor de fundo) via FormatacaoPopover.
function TextoLivreCampo({
  valor,
  formatacao,
  onSalvar,
  onFormatar,
  placeholder,
}: {
  valor: string | null;
  formatacao: FormatacaoTexto;
  onSalvar: (v: string) => void;
  onFormatar: (f: FormatacaoTexto) => void;
  placeholder?: string;
}) {
  return (
    <div
      className="flex min-h-6 items-center gap-1 rounded px-1"
      style={formatacao.fundo ? { backgroundColor: formatacao.fundo + "33" } : undefined}
    >
      <input
        defaultValue={valor ?? ""}
        placeholder={placeholder}
        onBlur={(e) => {
          if (e.target.value !== (valor ?? "")) onSalvar(e.target.value);
        }}
        onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
        style={{ color: formatacao.cor ?? undefined }}
        className={cn("w-full min-w-0 bg-transparent text-xs outline-none placeholder:text-muted-foreground", formatacao.negrito && "font-bold")}
      />
      <FormatacaoPopover formatacao={formatacao} onChange={onFormatar} />
    </div>
  );
}

type Membro = { userId: string; name: string | null };

// Quem vai criar a tarefa escolhe o responsável aqui — não é "ver a lista de outra pessoa",
// é só criar uma tarefa já atribuída (ela some da visão de quem criou e aparece na lista
// pessoal de quem recebeu, marcada com um ícone "atribuído por").
function ResponsavelPicker({ userId, membros, valor, onChange }: { userId: string; membros: Membro[]; valor: string; onChange: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const outros = membros.filter((m) => m.userId !== userId).sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
  const nomeAtual = valor === userId ? "Eu" : (membros.find((m) => m.userId === valor)?.name ?? "Eu");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            title="Responsável pela tarefa"
            className="flex h-6 shrink-0 items-center gap-1 rounded-md border border-transparent px-1.5 text-xs text-muted-foreground hover:border-input hover:bg-accent"
          />
        }
      >
        <User className="size-3" />
        {nomeAtual}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-48 p-1">
        <button
          type="button"
          onClick={() => {
            onChange(userId);
            setOpen(false);
          }}
          className={cn("flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent", valor === userId && "bg-accent")}
        >
          Eu
        </button>
        {outros.length > 0 && <div className="my-1 border-t" />}
        {outros.map((m) => (
          <button
            key={m.userId}
            type="button"
            onClick={() => {
              onChange(m.userId);
              setOpen(false);
            }}
            className={cn("flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent", valor === m.userId && "bg-accent")}
          >
            <span className="min-w-0 truncate">{m.name ?? "—"}</span>
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

// Só pra administrador — troca de QUAL lista está sendo mostrada (a minha ou a de outro
// membro). Não é uma formatação de célula, é a entrada principal do modo admin, então fica
// no cabeçalho do card, ao lado de "Colunas".
function VisualizarComoAdmin({
  userId,
  membros,
  visualizando,
  carregando,
  onEscolher,
}: {
  userId: string;
  membros: Membro[];
  visualizando: string;
  carregando: boolean;
  onEscolher: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const outros = membros.filter((m) => m.userId !== userId).sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
  const rotulo = visualizando === userId ? "Minha lista" : (membros.find((m) => m.userId === visualizando)?.name ?? "Minha lista");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        disabled={carregando}
        render={
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs hover:bg-accent disabled:cursor-wait disabled:opacity-50"
          />
        }
      >
        <Users className="size-3.5" />
        {carregando ? "Carregando…" : rotulo}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56 p-1">
        <button
          type="button"
          onClick={() => {
            onEscolher(userId);
            setOpen(false);
          }}
          className={cn("flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent", visualizando === userId && "bg-accent")}
        >
          Minha lista
        </button>
        {outros.length > 0 && <div className="my-1 border-t" />}
        {outros.map((m) => (
          <button
            key={m.userId}
            type="button"
            onClick={() => {
              onEscolher(m.userId);
              setOpen(false);
            }}
            className={cn(
              "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent",
              visualizando === m.userId && "bg-accent"
            )}
          >
            <span className="min-w-0 truncate">{m.name ?? "—"}</span>
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

// Barra de scroll horizontal feita na mão (em vez de confiar no scroll nativo do navegador,
// que em alguns ambientes/temas fica fino/pouco visível demais e passa despercebido) — sempre
// visível, grossa, logo abaixo da tabela. Lê a posição/tamanho do scroll do container via
// evento "scroll" + ResizeObserver, e arrasta mudando `scrollLeft` diretamente.
function ScrollbarHorizontal({
  containerRef,
  gatilhoRecalculo,
}: {
  containerRef: React.RefObject<HTMLDivElement | null>;
  // Qualquer número que muda quando a largura da tabela muda (ex: `larguraTabela` calculado
  // pelo componente pai). Sem isso, a barra só mede o scroll uma vez no mount — nesse momento
  // a tabela ainda pode não ter o tamanho final (a largura do container só é conhecida depois
  // de um ResizeObserver próprio do pai rodar), então a barra "trava" num estado desatualizado
  // (normalmente escondida) e nunca descobre que passou a ter overflow depois.
  gatilhoRecalculo: number;
}) {
  const [thumb, setThumb] = useState({ larguraPct: 100, esquerdaPct: 0 });
  const [arrastando, setArrastando] = useState(false);

  const atualizar = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const { scrollWidth, clientWidth, scrollLeft } = el;
    if (scrollWidth <= clientWidth) {
      setThumb({ larguraPct: 100, esquerdaPct: 0 });
      return;
    }
    setThumb({
      larguraPct: (clientWidth / scrollWidth) * 100,
      esquerdaPct: (scrollLeft / scrollWidth) * 100,
    });
  }, [containerRef]);

  useEffect(() => {
    atualizar();
  }, [gatilhoRecalculo, atualizar]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("scroll", atualizar);
    const obs = new ResizeObserver(atualizar);
    obs.observe(el);
    return () => {
      el.removeEventListener("scroll", atualizar);
      obs.disconnect();
    };
  }, [containerRef, atualizar]);

  function onMouseDownThumb(e: React.MouseEvent) {
    e.preventDefault();
    const el = containerRef.current;
    if (!el || el.scrollWidth <= el.clientWidth) return;
    const inicioX = e.clientX;
    const inicioScroll = el.scrollLeft;
    const escala = el.scrollWidth / el.clientWidth;
    setArrastando(true);

    function onMove(ev: MouseEvent) {
      el!.scrollLeft = inicioScroll + (ev.clientX - inicioX) * escala;
    }
    function onUp() {
      setArrastando(false);
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    }
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }

  if (thumb.larguraPct >= 100) return null;

  return (
    <div className="flex h-4 w-full shrink-0 items-center border-t bg-muted px-1">
      <div className="relative h-2 w-full rounded-full bg-border">
        <div
          onMouseDown={onMouseDownThumb}
          title="Arrastar pra rolar"
          className={cn(
            "absolute top-0 h-2 cursor-grab rounded-full bg-muted-foreground active:cursor-grabbing",
            arrastando ? "bg-primary" : "hover:bg-primary/80"
          )}
          style={{ width: `${thumb.larguraPct}%`, left: `${thumb.esquerdaPct}%` }}
        />
      </div>
    </div>
  );
}

export function ListaPessoal({
  workspaceId,
  tarefasIniciais,
  userId,
  membros,
  souAdmin,
  souCoordenador,
}: {
  workspaceId: string;
  tarefasIniciais: TarefaPessoal[];
  userId: string;
  membros: Membro[];
  souAdmin: boolean;
  souCoordenador: boolean;
}) {
  // `tarefas` é sempre o que está na tela; `minhaLista` guarda minha própria lista separada
  // pra não perder edições feitas nela quando eu troco pra ver a lista de outra pessoa e volto
  // (ver mudarVisualizacao). As duas ficam sincronizadas enquanto `visualizando === userId`.
  const [tarefas, setTarefas] = useState(tarefasIniciais);
  const [minhaLista, setMinhaLista] = useState(tarefasIniciais);
  const [visualizando, setVisualizando] = useState(userId);
  const [carregandoVisualizacao, setCarregandoVisualizacao] = useState(false);
  const visualizandoOutro = visualizando !== userId;
  // Administrador tem acesso total na lista de qualquer um; coordenador só pode mexer no
  // campo Obs Coord (o resto da linha vira somente-leitura — ver `somenteObsCoord` abaixo e o
  // `pointer-events-none` no <tr>). Nunca os dois ao mesmo tempo: admin sempre tem prioridade.
  const comoAdmin = visualizandoOutro && souAdmin;
  const comoCoordenador = visualizandoOutro && !souAdmin && souCoordenador;
  const somenteObsCoord = comoCoordenador;
  const [responsavelId, setResponsavelId] = useState(userId);

  useEffect(() => {
    setResponsavelId(visualizando);
  }, [visualizando]);

  async function mudarVisualizacao(novoId: string) {
    if (novoId === visualizando) return;
    if (novoId === userId) {
      setVisualizando(userId);
      setTarefas(minhaLista);
      return;
    }
    setCarregandoVisualizacao(true);
    const res = await listarListaPessoalDeAction(workspaceId, novoId);
    setCarregandoVisualizacao(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    setVisualizando(novoId);
    setTarefas(res.tarefas);
  }
  const [colunas, setColunas] = useState<ColunaId[]>(COLUNAS_PADRAO);
  const [altura, setAltura] = useState(ALTURA_PADRAO);
  const [larguras, setLarguras] = useState<Record<ColunaId, number>>(LARGURAS_PADRAO);
  // Largura do Nome: enquanto ninguém mexeu em nenhuma coluna ele "preenche" a tela
  // (nomeAuto); no primeiro arrasto de QUALQUER coluna ele congela — daí em diante cada coluna
  // só mexe em si mesma e a tabela cresce/encolhe (com rolagem se passar da tela).
  const [larguraNome, setLarguraNome] = useState<number | null>(null);
  const larguraNomeRef = useRef<number | null>(null);
  const [larguraContainer, setLarguraContainer] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
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
      const brutoLarguras = localStorage.getItem(chaveLarguras(workspaceId));
      if (brutoLarguras) {
        const { nome, ...resto } = JSON.parse(brutoLarguras) as Partial<Record<ColunaId, number>> & { nome?: number };
        setLarguras((prev) => ({ ...prev, ...resto }));
        if (typeof nome === "number") {
          larguraNomeRef.current = nome;
          setLarguraNome(nome);
        }
      }
    } catch {
      // sem persistência local se localStorage falhar
    }
  }, [workspaceId]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const medir = () => setLarguraContainer(el.clientWidth);
    medir();
    const obs = new ResizeObserver(medir);
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

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

  function salvarLarguras(l: Record<ColunaId, number>, nome: number | null) {
    try {
      localStorage.setItem(chaveLarguras(workspaceId), JSON.stringify({ ...l, ...(nome !== null ? { nome } : {}) }));
    } catch {
      // sem persistência local se localStorage falhar
    }
  }

  // Alça na borda DIREITA da coluna: a borda acompanha o mouse, a coluna muda só a si mesma e as
  // seguintes deslizam — nunca mexe no espaço de outra coluna. Nome não tem "absorvedor": a
  // tabela em si é que cresce (com rolagem) ou encolhe.
  function redimensionar(coluna: ColunaId | "nome", deltaX: number) {
    if (larguraNomeRef.current === null) larguraNomeRef.current = nomeAuto;
    if (coluna === "nome") {
      larguraNomeRef.current = Math.max(LARGURA_NOME_MINIMA, larguraNomeRef.current + deltaX);
      setLarguraNome(larguraNomeRef.current);
      salvarLarguras(larguras, larguraNomeRef.current);
      return;
    }
    setLarguraNome(larguraNomeRef.current);
    setLarguras((prev) => {
      const proximo = { ...prev, [coluna]: Math.max(LARGURA_MINIMA, prev[coluna] + deltaX) };
      salvarLarguras(proximo, larguraNomeRef.current);
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
    const aplicar = (prev: TarefaPessoal[]) => prev.map((t) => (t.id === id ? { ...t, ...tarefaOtimista } : t));
    setTarefas(aplicar);
    if (visualizando === userId) setMinhaLista(aplicar);

    const res = await atualizarTarefaAction(workspaceId, id, patch, comoAdmin, comoCoordenador);
    if (!res.ok) {
      toast.error(res.error);
      const reverter = (prev: TarefaPessoal[]) => prev.map((t) => (t.id === id && original ? original : t));
      setTarefas(reverter);
      if (visualizando === userId) setMinhaLista(reverter);
    }
  }

  // Reatribuir é um `alterar` especial: se a tarefa deixar de pertencer à visualização atual
  // (nem dono, nem quem criou, em relação a quem eu estou vendo agora), ela some da tela — é
  // exatamente o que já acontecia na criação, só que agora pode rolar a qualquer momento via
  // a coluna "Atribuído", inclusive vendo a lista de outra pessoa como admin.
  async function mudarResponsavel(t: TarefaPessoal, novoDonoId: string) {
    if (novoDonoId === t.donoId) return;
    const aindaAparece = novoDonoId === visualizando || t.criadoPorId === visualizando;
    const novoDonoNome = novoDonoId === userId ? null : (membros.find((m) => m.userId === novoDonoId)?.name ?? null);
    const original = tarefas;
    const originalMinha = minhaLista;

    const aplicar = (prev: TarefaPessoal[]) =>
      aindaAparece
        ? prev.map((x) => (x.id === t.id ? { ...x, donoId: novoDonoId, donoNome: novoDonoNome } : x))
        : prev.filter((x) => x.id !== t.id);
    setTarefas(aplicar);
    if (visualizando === userId) setMinhaLista(aplicar);

    const res = await atualizarTarefaAction(workspaceId, t.id, { donoId: novoDonoId }, comoAdmin);
    if (!res.ok) {
      toast.error(res.error);
      setTarefas(original);
      if (visualizando === userId) setMinhaLista(originalMinha);
    } else if (novoDonoId !== visualizando) {
      toast.success(`Tarefa atribuída a ${novoDonoNome ?? "essa pessoa"}.`);
    }
  }

  async function excluir(id: string) {
    const original = tarefas;
    const originalMinha = minhaLista;
    setTarefas((prev) => prev.filter((t) => t.id !== id));
    if (visualizando === userId) setMinhaLista((prev) => prev.filter((t) => t.id !== id));

    const res = await excluirTarefaAction(workspaceId, id, comoAdmin);
    if (!res.ok) {
      toast.error(res.error);
      setTarefas(original);
      if (visualizando === userId) setMinhaLista(originalMinha);
    }
  }

  async function adicionar() {
    const nome = novaTarefa.trim();
    if (!nome || criandoRef.current) return;
    criandoRef.current = true;
    setNovaTarefa("");
    const destinoId = responsavelId;
    const paraMim = destinoId === userId;

    const res = await criarTarefaAction(workspaceId, nome, paraMim ? undefined : destinoId);
    criandoRef.current = false;
    if (!res.ok) {
      toast.error(res.error);
      setNovaTarefa(nome);
      return;
    }
    const nomeDestino = paraMim ? null : (membros.find((m) => m.userId === destinoId)?.name ?? null);
    const nova = { ...res.tarefa, donoNome: nomeDestino };
    // Só entra na tela se pertencer à visualização atual — "minha lista" sempre mostra o que
    // eu criei (mesmo atribuído a outro), já vendo a lista de alguém como admin só mostra se
    // o destino for essa mesma pessoa.
    if (destinoId === visualizando || visualizando === userId) {
      setTarefas((prev) => [nova, ...prev]);
      if (visualizando === userId) setMinhaLista((prev) => [nova, ...prev]);
    }
    if (destinoId !== visualizando) toast.success(`Tarefa atribuída a ${nomeDestino ?? "essa pessoa"}.`);
  }

  const colunasVisiveis = COLUNAS.filter((c) => colunas.includes(c.id));
  const somaColunas = colunasVisiveis.reduce((acc, c) => acc + larguras[c.id], 0);
  const nomeAuto = Math.max(LARGURA_NOME_MINIMA, larguraContainer - LARGURA_FIXA * 2 - somaColunas);
  const nomeEfetivo = larguraNome ?? nomeAuto;
  const larguraTabela = LARGURA_FIXA * 2 + nomeEfetivo + somaColunas;

  return (
    <Card className="gap-0 pb-0">
      <CardHeader className="border-b pb-3">
        <div className="flex items-center gap-2">
          <ClipboardList className="size-4 text-primary" />
          <CardTitle>
            Lista pessoal
            {visualizandoOutro && (
              <span className="ml-1 font-normal text-muted-foreground">
                — {membros.find((m) => m.userId === visualizando)?.name ?? "—"}
                {comoCoordenador && " (somente Obs Coord)"}
              </span>
            )}
          </CardTitle>
        </div>
        <CardAction className="flex items-center gap-2">
          {(souAdmin || souCoordenador) && membros.length > 1 && (
            <VisualizarComoAdmin
              userId={userId}
              membros={membros}
              visualizando={visualizando}
              carregando={carregandoVisualizacao}
              onEscolher={mudarVisualizacao}
            />
          )}
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

      <CardContent ref={containerRef} style={{ height: altura }} className="scrollbar-escondida overflow-auto px-0 pt-2">
        <table className="table-fixed text-sm" style={{ width: larguraTabela }}>
          <thead className="sticky top-0 bg-card">
            <tr className="border-b text-xs text-muted-foreground">
              <th style={{ width: LARGURA_FIXA }}></th>
              <th className="relative overflow-hidden px-2 py-1 text-left font-medium text-ellipsis whitespace-nowrap" style={{ width: nomeEfetivo }}>
                Nome da tarefa
                <ResizeHandle curto lado="direita" onResize={(d) => redimensionar("nome", d)} />
              </th>
              {/* Sempre na ordem canônica de COLUNAS (não na ordem de `colunas`, que é só o
                  conjunto ativado/desativado) — o corpo da tabela abaixo também renderiza
                  cada coluna nessa mesma ordem fixa, então cabeçalho e célula precisam
                  concordar ou desalinham. */}
              {colunasVisiveis.map((c) => (
                <th
                  key={c.id}
                  className="relative overflow-hidden px-2 py-1 text-left font-medium text-ellipsis whitespace-nowrap"
                  style={{ width: larguras[c.id] }}
                >
                  {c.label}
                  <ResizeHandle curto lado="direita" onResize={(d) => redimensionar(c.id, d)} />
                </th>
              ))}
              <th style={{ width: LARGURA_FIXA }}></th>
            </tr>
          </thead>
          <tbody>
            {!somenteObsCoord && (
              <tr className="border-b">
                <td className="px-2 py-1 text-muted-foreground">
                  <Plus className="size-3.5" />
                </td>
                <td className="px-2 py-1" colSpan={colunas.length + 2}>
                  <div className="flex items-center gap-2">
                    <input
                      value={novaTarefa}
                      onChange={(e) => setNovaTarefa(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && adicionar()}
                      onBlur={adicionar}
                      placeholder="Adicionar tarefa"
                      className="w-full min-w-0 bg-transparent text-sm text-muted-foreground outline-none placeholder:text-muted-foreground"
                    />
                    {membros.length > 1 && <ResponsavelPicker userId={userId} membros={membros} valor={responsavelId} onChange={setResponsavelId} />}
                  </div>
                </td>
              </tr>
            )}
            {tarefas.map((t) => (
              <tr key={t.id} className={cn("group/linha border-b last:border-b-0 hover:bg-accent/40", somenteObsCoord && "pointer-events-none opacity-80")}>
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
                  <div
                    className="flex min-h-6 items-center gap-1 rounded px-1"
                    style={t.nomeFundo ? { backgroundColor: t.nomeFundo + "33" } : undefined}
                  >
                    <input
                      defaultValue={t.nome}
                      onBlur={(e) => {
                        if (e.target.value.trim() && e.target.value !== t.nome) alterar(t.id, { nome: e.target.value }, { nome: e.target.value.trim() });
                      }}
                      onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                      style={t.status === "feito" ? undefined : { color: t.nomeCor ?? undefined }}
                      className={cn(
                        "w-full min-w-0 bg-transparent outline-none",
                        t.nomeNegrito && "font-bold",
                        t.status === "feito" && "text-muted-foreground line-through"
                      )}
                    />
                    {t.criadoPorId && t.criadoPorId !== userId && (
                      <span title={`Atribuído por ${t.criadoPorNome ?? "alguém"}`} className="shrink-0 text-muted-foreground">
                        <User className="size-3" />
                      </span>
                    )}
                    <FormatacaoPopover
                      formatacao={{ negrito: t.nomeNegrito, cor: t.nomeCor, fundo: t.nomeFundo }}
                      onChange={(f) =>
                        alterar(t.id, { nomeNegrito: f.negrito, nomeCor: f.cor, nomeFundo: f.fundo }, { nomeNegrito: f.negrito, nomeCor: f.cor, nomeFundo: f.fundo })
                      }
                    />
                  </div>
                </td>
                {colunas.includes("atribuido") && (
                  <td className="px-2 py-1">
                    <ResponsavelPicker userId={userId} membros={membros} valor={t.donoId} onChange={(novoId) => mudarResponsavel(t, novoId)} />
                  </td>
                )}
                {colunas.includes("status") && (
                  <td className="px-2 py-1">
                    <TextoLivreCampo
                      valor={t.statusLivre}
                      formatacao={{ negrito: t.statusLivreNegrito, cor: t.statusLivreCor, fundo: t.statusLivreFundo }}
                      placeholder="—"
                      onSalvar={(v) => alterar(t.id, { statusLivre: v }, { statusLivre: v.trim() || null })}
                      onFormatar={(f) =>
                        alterar(
                          t.id,
                          { statusLivreNegrito: f.negrito, statusLivreCor: f.cor, statusLivreFundo: f.fundo },
                          { statusLivreNegrito: f.negrito, statusLivreCor: f.cor, statusLivreFundo: f.fundo }
                        )
                      }
                    />
                  </td>
                )}
                {colunas.includes("obs") && (
                  <td className="px-2 py-1">
                    <TextoLivreCampo
                      valor={t.obs}
                      formatacao={{ negrito: t.obsNegrito, cor: t.obsCor, fundo: t.obsFundo }}
                      placeholder="—"
                      onSalvar={(v) => alterar(t.id, { obs: v }, { obs: v.trim() || null })}
                      onFormatar={(f) =>
                        alterar(t.id, { obsNegrito: f.negrito, obsCor: f.cor, obsFundo: f.fundo }, { obsNegrito: f.negrito, obsCor: f.cor, obsFundo: f.fundo })
                      }
                    />
                  </td>
                )}
                {colunas.includes("obsCoord") && (
                  <td className="pointer-events-auto px-2 py-1">
                    <input
                      defaultValue={t.obsCoord ?? ""}
                      placeholder="—"
                      onBlur={(e) => {
                        if (e.target.value !== (t.obsCoord ?? "")) alterar(t.id, { obsCoord: e.target.value }, { obsCoord: e.target.value.trim() || null });
                      }}
                      onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                      className="w-full min-w-0 bg-transparent text-xs outline-none placeholder:text-muted-foreground"
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
                {colunas.includes("dataInicial") && (
                  <td className="px-2 py-1">
                    <DatePickerField value={t.dataInicial} onChange={(v) => alterar(t.id, { dataInicial: v }, { dataInicial: v })} />
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
            ))}
          </tbody>
        </table>
      </CardContent>
      <ScrollbarHorizontal containerRef={containerRef} gatilhoRecalculo={larguraTabela} />

      <ResizeHandleVertical onResize={onResizeAltura} />
    </Card>
  );
}
