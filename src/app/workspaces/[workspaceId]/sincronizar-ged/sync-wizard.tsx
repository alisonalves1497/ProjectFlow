"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, AlertTriangle, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { STATUS_LABELS, type StatusDocumento } from "@/lib/statusGraph";
import {
  listarAbasGedAction,
  analisarPlanilhaGedAction,
  confirmarSincronizacaoGedAction,
} from "./actions";

type ObraOpcao = { id: string; projetoId: string; label: string; projetoNome: string; obraNome: string; obraCode: string };
type Disciplina = { disciplinaId: string; code: string; name: string; secoes: { id: string; name: string }[] };
type Fase = { id: string; name: string; code: string };
type Etapa = "config" | "revisao" | "concluido";

type LinhaAnalisada = {
  codigo: string;
  descricao: string;
  statusTexto: string;
  revisao: string;
  dataAlteracao: string | null;
  gedOrigem: string;
  documentoIdExistente: string | null;
  statusAtual: StatusDocumento | null;
  secaoIdSugerida: string | null;
  statusSugerido: StatusDocumento | null;
};

type LinhaEditavel = LinhaAnalisada & { secaoId: string; status: StatusDocumento | ""; criar: boolean };

function arquivoParaBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function SincronizarGedWizard({
  workspaceId,
  obraOpcoes,
  disciplinasPorObra,
  fases,
  obraIdInicial,
}: {
  workspaceId: string;
  obraOpcoes: ObraOpcao[];
  disciplinasPorObra: Record<string, Disciplina[]>;
  fases: Fase[];
  obraIdInicial?: string;
}) {
  const [etapa, setEtapa] = useState<Etapa>("config");
  const [pending, setPending] = useState(false);

  const [obraId, setObraId] = useState(obraIdInicial ?? obraOpcoes[0]?.id ?? "");
  const [disciplinaId, setDisciplinaId] = useState("");
  const [faseId, setFaseId] = useState(fases[0]?.id ?? "");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [abas, setAbas] = useState<string[]>([]);
  const [sheetName, setSheetName] = useState("");

  const [linhas, setLinhas] = useState<LinhaEditavel[]>([]);
  const [secoesDaDisciplina, setSecoesDaDisciplina] = useState<{ id: string; name: string }[]>([]);
  const [resultado, setResultado] = useState<{ atualizados: string[]; criados: string[]; ignorados: { codigo: string; motivo: string }[] } | null>(
    null
  );

  const disciplinasDaObra = disciplinasPorObra[obraId] ?? [];

  async function onArquivoSelecionado(file: File | null) {
    setArquivo(file);
    setAbas([]);
    setSheetName("");
    if (!file) return;
    setPending(true);
    try {
      const base64 = await arquivoParaBase64(file);
      const res = await listarAbasGedAction(workspaceId, base64);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setAbas(res.data);
      setSheetName(res.data[0] ?? "");
    } finally {
      setPending(false);
    }
  }

  async function analisar() {
    if (!arquivo || !sheetName || !disciplinaId) {
      toast.error("Escolha a Obra, a Disciplina e o arquivo antes de continuar.");
      return;
    }
    setPending(true);
    try {
      const base64 = await arquivoParaBase64(arquivo);
      const res = await analisarPlanilhaGedAction(workspaceId, obraId, disciplinaId, base64, sheetName);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      if (res.data.linhas.length === 0) {
        toast.error("Não encontrei nenhuma linha válida nessa aba.");
        return;
      }
      setSecoesDaDisciplina(res.data.secoesDaDisciplina);
      setLinhas(
        res.data.linhas.map((l) => ({
          ...l,
          secaoId: l.secaoIdSugerida ?? "",
          status: l.statusSugerido ?? "",
          // Documento novo só entra se alguém marcar de propósito — nada é criado sem OK explícito.
          criar: false,
        }))
      );
      setEtapa("revisao");
    } finally {
      setPending(false);
    }
  }

  const pendentesDeRevisao = useMemo(
    () => linhas.filter((l) => (l.documentoIdExistente || l.criar) && (!l.secaoId || !l.status)).length,
    [linhas]
  );
  const novosMarcados = linhas.filter((l) => !l.documentoIdExistente && l.criar).length;
  const existentesCount = linhas.filter((l) => l.documentoIdExistente).length;

  function atualizarLinha(codigo: string, patch: Partial<LinhaEditavel>) {
    setLinhas((prev) => prev.map((l) => (l.codigo === codigo ? { ...l, ...patch } : l)));
  }

  async function confirmar() {
    if (pendentesDeRevisao > 0) {
      toast.error("Ainda tem linha sem Seção ou Status definido — resolve antes de confirmar.");
      return;
    }
    setPending(true);
    try {
      const linhasParaAplicar = linhas
        .filter((l) => l.documentoIdExistente || l.criar)
        .map((l) => ({
          codigo: l.codigo,
          descricao: l.descricao,
          status: (l.status || "previsto") as StatusDocumento,
          revisao: l.revisao,
          dataAlteracao: l.dataAlteracao,
          gedOrigem: l.gedOrigem,
          documentoIdExistente: l.documentoIdExistente,
          criar: l.criar,
          secaoId: l.secaoId || null,
        }));
      const res = await confirmarSincronizacaoGedAction(workspaceId, obraId, disciplinaId, faseId, linhasParaAplicar);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setResultado(res.data);
      setEtapa("concluido");
    } finally {
      setPending(false);
    }
  }

  if (etapa === "concluido" && resultado) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 p-4 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-400">
          <CheckCircle2 className="size-5 shrink-0" />
          <p className="text-sm">
            {resultado.atualizados.length} documento{resultado.atualizados.length !== 1 ? "s" : ""} atualizado
            {resultado.atualizados.length !== 1 ? "s" : ""}, {resultado.criados.length} criado
            {resultado.criados.length !== 1 ? "s" : ""}
            {resultado.ignorados.length > 0 && `, ${resultado.ignorados.length} ignorado${resultado.ignorados.length !== 1 ? "s" : ""}`}.
          </p>
        </div>
        {resultado.ignorados.length > 0 && (
          <div className="rounded-md border p-3 text-sm">
            <p className="mb-2 font-medium text-muted-foreground">Ignorados:</p>
            <ul className="space-y-1">
              {resultado.ignorados.map((i) => (
                <li key={i.codigo} className="font-mono text-xs text-muted-foreground">
                  {i.codigo} — {i.motivo}
                </li>
              ))}
            </ul>
          </div>
        )}
        <Button
          type="button"
          onClick={() => {
            setEtapa("config");
            setArquivo(null);
            setAbas([]);
            setLinhas([]);
            setResultado(null);
          }}
        >
          Sincronizar outra planilha
        </Button>
      </div>
    );
  }

  if (etapa === "revisao") {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {existentesCount} vão ser atualizados · {linhas.length - existentesCount} não existem ainda ({novosMarcados}{" "}
            marcado{novosMarcados !== 1 ? "s" : ""} pra criar)
          </p>
          {pendentesDeRevisao > 0 && (
            <span className="flex items-center gap-1 text-xs text-amber-600">
              <AlertTriangle className="size-3.5" />
              {pendentesDeRevisao} linha{pendentesDeRevisao !== 1 ? "s" : ""} precisa{pendentesDeRevisao === 1 ? "" : "m"} de revisão
            </span>
          )}
        </div>

        <div className="max-h-[60vh] overflow-y-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-40">Código</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="w-44">Seção</TableHead>
                <TableHead className="w-40">Status</TableHead>
                <TableHead className="w-20">Rev.</TableHead>
                <TableHead className="w-24">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {linhas.map((l) => {
                const novo = !l.documentoIdExistente;
                const precisaSecao = (l.documentoIdExistente || l.criar) && !l.secaoId;
                const precisaStatus = (l.documentoIdExistente || l.criar) && !l.status;
                return (
                  <TableRow key={l.codigo} className={novo && !l.criar ? "opacity-60" : undefined}>
                    <TableCell className="truncate font-mono text-xs">{l.codigo}</TableCell>
                    <TableCell className="truncate text-sm">{l.descricao}</TableCell>
                    <TableCell>
                      <select
                        value={l.secaoId}
                        onChange={(e) => atualizarLinha(l.codigo, { secaoId: e.target.value })}
                        disabled={novo && !l.criar}
                        className={`h-8 w-full rounded-md border bg-transparent px-1.5 text-xs ${precisaSecao ? "border-amber-500" : ""}`}
                      >
                        <option value="">— escolher —</option>
                        {secoesDaDisciplina.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </TableCell>
                    <TableCell>
                      <select
                        value={l.status}
                        onChange={(e) => atualizarLinha(l.codigo, { status: e.target.value as StatusDocumento })}
                        disabled={novo && !l.criar}
                        className={`h-8 w-full rounded-md border bg-transparent px-1.5 text-xs ${precisaStatus ? "border-amber-500" : ""}`}
                      >
                        <option value="">— escolher —</option>
                        {Object.entries(STATUS_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{l.revisao || "—"}</TableCell>
                    <TableCell>
                      {novo ? (
                        <label className="flex items-center gap-1.5 text-xs">
                          <input
                            type="checkbox"
                            className="checkbox-custom"
                            checked={l.criar}
                            onChange={(e) => atualizarLinha(l.codigo, { criar: e.target.checked })}
                          />
                          Criar
                        </label>
                      ) : (
                        <span className="text-xs text-muted-foreground">Atualizar</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" onClick={() => setEtapa("config")} disabled={pending}>
            Voltar
          </Button>
          <Button type="button" onClick={confirmar} disabled={pending}>
            {pending ? "Aplicando..." : `Confirmar (${existentesCount + novosMarcados})`}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md space-y-4">
      <div className="space-y-2">
        <Label htmlFor="obraId">Obra</Label>
        <select
          id="obraId"
          value={obraId}
          onChange={(e) => {
            setObraId(e.target.value);
            setDisciplinaId("");
          }}
          className="h-9 w-full rounded-md border bg-transparent px-3 text-sm"
        >
          {obraOpcoes.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="disciplinaId">Disciplina</Label>
        <select
          id="disciplinaId"
          value={disciplinaId}
          onChange={(e) => setDisciplinaId(e.target.value)}
          className="h-9 w-full rounded-md border bg-transparent px-3 text-sm"
        >
          <option value="">— escolher —</option>
          {disciplinasDaObra.map((d) => (
            <option key={d.disciplinaId} value={d.disciplinaId}>
              {d.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="faseId">Fase</Label>
        <select id="faseId" value={faseId} onChange={(e) => setFaseId(e.target.value)} className="h-9 w-full rounded-md border bg-transparent px-3 text-sm">
          {fases.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">Só usada pra documento novo (os que já existem mantêm a fase que já têm).</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="arquivo">Planilha do GED</Label>
        <Input id="arquivo" type="file" accept=".xlsx,.xls" onChange={(e) => onArquivoSelecionado(e.target.files?.[0] ?? null)} />
      </div>

      {abas.length > 1 && (
        <div className="space-y-2">
          <Label htmlFor="sheetName">Aba</Label>
          <select id="sheetName" value={sheetName} onChange={(e) => setSheetName(e.target.value)} className="h-9 w-full rounded-md border bg-transparent px-3 text-sm">
            {abas.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
      )}

      <Button type="button" onClick={analisar} disabled={pending || !arquivo || !disciplinaId}>
        <Upload className="size-4" />
        {pending ? "Lendo..." : "Analisar planilha"}
      </Button>
    </div>
  );
}
