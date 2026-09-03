"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { CheckCircle2, AlertTriangle, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  listarAbasAction,
  analisarPlanilhaAction,
  criarObraParaImportacaoAction,
  confirmarImportacaoAction,
  type LinhaComSugestao,
  type CatalogoParaImportacao,
} from "./actions";
import type { LinhaParaImportar, GrupoSecao } from "@/services/importDocumentosService";

type Projeto = { id: string; code: string; name: string };
type Etapa = "obra" | "upload" | "revisao" | "concluido";

const CRIAR_NOVO = "__novo__";

type LinhaEditavel = LinhaComSugestao & { incluir: boolean; disciplinaId: string };
type GrupoEditavel = GrupoSecao & { tipoDocumentoId: string };

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

export function ImportWizard({ workspaceId, projetos }: { workspaceId: string; projetos: Projeto[] }) {
  const [etapa, setEtapa] = useState<Etapa>("obra");
  const [pending, setPending] = useState(false);

  // Etapa 1 — Obra
  const [projetoId, setProjetoId] = useState<string>(projetos[0]?.id ?? "__novo__");
  const [projetoCode, setProjetoCode] = useState("");
  const [projetoNome, setProjetoNome] = useState("");
  const [obraCode, setObraCode] = useState("");
  const [obraNome, setObraNome] = useState("");
  const [obraId, setObraId] = useState<string | null>(null);
  const [obraProjetoId, setObraProjetoId] = useState<string | null>(null);

  // Etapa 2 — Upload
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [abas, setAbas] = useState<string[]>([]);
  const [sheetName, setSheetName] = useState<string>("");

  // Etapa 3 — Revisão
  const [linhas, setLinhas] = useState<LinhaEditavel[]>([]);
  const [grupos, setGrupos] = useState<GrupoEditavel[]>([]);
  const [catalogo, setCatalogo] = useState<CatalogoParaImportacao | null>(null);
  const [faseId, setFaseId] = useState<string>("");

  // Resultado
  const [resultado, setResultado] = useState<{ criados: number; erros: { descricao: string; erro: string }[] } | null>(null);

  async function handleCriarObra() {
    if (!obraCode.trim() || !obraNome.trim()) {
      toast.error("Preenche o código e o nome da Obra.");
      return;
    }
    if (projetoId === "__novo__" && (!projetoCode.trim() || !projetoNome.trim())) {
      toast.error("Preenche o código e o nome do novo Projeto.");
      return;
    }
    setPending(true);
    const res = await criarObraParaImportacaoAction(workspaceId, {
      projetoId: projetoId === "__novo__" ? null : projetoId,
      projetoCode: projetoId === "__novo__" ? projetoCode : undefined,
      projetoNome: projetoId === "__novo__" ? projetoNome : undefined,
      obraCode,
      obraNome,
    });
    setPending(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    setObraId(res.data.obraId);
    setObraProjetoId(res.data.projetoId);
    setEtapa("upload");
  }

  async function handleArquivoSelecionado(file: File) {
    setArquivo(file);
    setPending(true);
    const base64 = await arquivoParaBase64(file);
    const res = await listarAbasAction(workspaceId, base64);
    setPending(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    setAbas(res.data);
    setSheetName(res.data[0] ?? "");
  }

  async function handleAnalisar() {
    if (!arquivo || !sheetName) return;
    setPending(true);
    const base64 = await arquivoParaBase64(arquivo);
    const res = await analisarPlanilhaAction(workspaceId, base64, sheetName);
    setPending(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    setCatalogo(res.data.catalogo);
    setFaseId(res.data.catalogo.fases[0]?.id ?? "");
    setGrupos(res.data.grupos.map((g) => ({ ...g, tipoDocumentoId: g.tipoDocumentoIdSugerido ?? CRIAR_NOVO })));
    setLinhas(
      res.data.linhas.map((l) => ({
        ...l,
        incluir: true,
        disciplinaId: l.disciplinaIdSugerida ?? "",
      }))
    );
    setEtapa("revisao");
  }

  function atualizarLinha(idx: number, patch: Partial<LinhaEditavel>) {
    setLinhas((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  }

  function atualizarGrupo(secaoExcel: string, tipoDocumentoId: string) {
    setGrupos((prev) => prev.map((g) => (g.secaoExcel === secaoExcel ? { ...g, tipoDocumentoId } : g)));
  }

  async function handleConfirmarImportacao() {
    if (!obraId || !faseId) return;
    const selecionadas = linhas.filter((l) => l.incluir);
    const semDisciplina = selecionadas.filter((l) => !l.disciplinaId);
    if (semDisciplina.length > 0) {
      toast.error(`${semDisciplina.length} linha(s) selecionada(s) sem Disciplina definida.`);
      return;
    }
    const grupoPorSecao = new Map(grupos.map((g) => [g.secaoExcel, g]));
    const payload: LinhaParaImportar[] = selecionadas.map((l) => {
      const grupo = grupoPorSecao.get(l.secaoExcel);
      const tipoDocumentoId = grupo && grupo.tipoDocumentoId !== CRIAR_NOVO ? grupo.tipoDocumentoId : null;
      return { descricao: l.descricao, disciplinaId: l.disciplinaId, tipoDocumentoId, tipoNome: l.secaoExcel, faseId };
    });
    setPending(true);
    const res = await confirmarImportacaoAction(workspaceId, obraId, payload);
    setPending(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    setResultado(res.data);
    setEtapa("concluido");
  }

  const totalSelecionadas = linhas.filter((l) => l.incluir).length;
  const semDisciplina = linhas.filter((l) => l.incluir && !l.disciplinaId).length;
  const gruposNovos = grupos.filter((g) => g.tipoDocumentoId === CRIAR_NOVO).length;

  return (
    <div className="space-y-6">
      {/* Indicador de etapas */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {(["obra", "upload", "revisao", "concluido"] as Etapa[]).map((e, i) => (
          <span key={e} className={etapa === e ? "font-semibold text-foreground" : ""}>
            {i > 0 && "→ "}
            {{ obra: "1. Obra", upload: "2. Planilha", revisao: "3. Revisão", concluido: "4. Concluído" }[e]}
          </span>
        ))}
      </div>

      {etapa === "obra" && (
        <div className="max-w-md space-y-4 rounded-lg border p-4">
          <div className="space-y-2">
            <Label>Projeto</Label>
            <Select value={projetoId} onValueChange={(v) => v && setProjetoId(v)}>
              <SelectTrigger className="w-full">
                <SelectValue>
                  {(v: string) => {
                    if (v === "__novo__") return "+ Criar novo projeto";
                    const p = projetos.find((pr) => pr.id === v);
                    return p ? `${p.name} (${p.code})` : "Selecione";
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__novo__">+ Criar novo projeto</SelectItem>
                {projetos.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} ({p.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {projetoId === "__novo__" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="projetoCode">Código do projeto</Label>
                <Input id="projetoCode" value={projetoCode} onChange={(e) => setProjetoCode(e.target.value)} placeholder="ex: LOTE09" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="projetoNome">Nome do projeto</Label>
                <Input id="projetoNome" value={projetoNome} onChange={(e) => setProjetoNome(e.target.value)} placeholder="ex: Lote 09" />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="obraCode">Código da obra</Label>
              <Input id="obraCode" value={obraCode} onChange={(e) => setObraCode(e.target.value)} placeholder="ex: LD" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="obraNome">Nome da obra</Label>
              <Input id="obraNome" value={obraNome} onChange={(e) => setObraNome(e.target.value)} placeholder="ex: LD Civil" />
            </div>
          </div>

          <Button onClick={handleCriarObra} disabled={pending}>
            {pending ? "Criando..." : "Criar Obra e continuar"}
          </Button>
        </div>
      )}

      {etapa === "upload" && (
        <div className="max-w-md space-y-4 rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Obra criada. Agora sobe a planilha (.xlsx).</p>
          <Input
            type="file"
            accept=".xlsx,.xls"
            onChange={(e) => e.target.files?.[0] && handleArquivoSelecionado(e.target.files[0])}
          />
          {abas.length > 0 && (
            <div className="space-y-2">
              <Label>Aba da planilha</Label>
              <Select value={sheetName} onValueChange={(v) => v && setSheetName(v)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {abas.map((a) => (
                    <SelectItem key={a} value={a}>
                      {a}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={handleAnalisar} disabled={pending}>
                <Upload className="size-4" />
                {pending ? "Analisando..." : "Analisar planilha"}
              </Button>
            </div>
          )}
        </div>
      )}

      {etapa === "revisao" && catalogo && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-4 rounded-lg border p-3 text-sm">
            <div className="space-y-1">
              <Label>Fase (aplicada a todos)</Label>
              <Select value={faseId} onValueChange={(v) => v && setFaseId(v)}>
                <SelectTrigger size="sm">
                  <SelectValue>{(v) => catalogo.fases.find((f) => f.id === v)?.name ?? "Selecione"}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {catalogo.fases.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-muted-foreground">
              {linhas.length} linhas encontradas · {totalSelecionadas} selecionadas
              {semDisciplina > 0 && <span className="text-destructive"> · {semDisciplina} sem Disciplina definida</span>}
            </p>
          </div>

          <div className="rounded-lg border p-3">
            <p className="mb-1 text-sm font-medium">Seções da planilha → Tipo de documento</p>
            <p className="mb-3 text-xs text-muted-foreground">
              Cada seção numerada do Excel (ex: "1.1 Investigação do Solo...") vira um Tipo de documento — reaproveita um já existente
              ou cria um novo com esse nome. {gruposNovos > 0 && `${gruposNovos} vão criar Tipo novo.`}
            </p>
            <div className="space-y-2">
              {grupos.map((g) => (
                <div key={g.secaoExcel} className="flex items-center gap-3 text-sm">
                  <span className="min-w-0 flex-1 truncate" title={g.secaoExcel}>
                    {g.secaoExcel} <span className="text-xs text-muted-foreground">({g.quantidade})</span>
                  </span>
                  <Select value={g.tipoDocumentoId} onValueChange={(v) => v && atualizarGrupo(g.secaoExcel, v)}>
                    <SelectTrigger size="sm" className="w-64 shrink-0">
                      <SelectValue>
                        {(v: string) =>
                          v === CRIAR_NOVO ? `+ Criar "${g.secaoExcel}"` : (catalogo.tipos.find((t) => t.id === v)?.name ?? "—")
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={CRIAR_NOVO}>+ Criar &quot;{g.secaoExcel}&quot;</SelectItem>
                      {catalogo.tipos.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </div>

          <div className="max-h-[24rem] overflow-y-auto rounded-lg border">
            <Table>
              <TableHeader className="sticky top-0 bg-background">
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Seção</TableHead>
                  <TableHead>Disciplina</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {linhas.map((l, idx) => (
                  <TableRow key={l.linha} className={!l.incluir ? "opacity-40" : undefined}>
                    <TableCell>
                      <input
                        type="checkbox"
                        className="checkbox-custom"
                        checked={l.incluir}
                        onChange={(e) => atualizarLinha(idx, { incluir: e.target.checked })}
                      />
                    </TableCell>
                    <TableCell className="max-w-xs truncate whitespace-normal" title={l.descricao}>
                      {l.descricao}
                    </TableCell>
                    <TableCell className="max-w-40 truncate text-xs text-muted-foreground" title={l.secaoExcel}>
                      {l.secaoExcel}
                    </TableCell>
                    <TableCell>
                      <Select value={l.disciplinaId || undefined} onValueChange={(v) => v && atualizarLinha(idx, { disciplinaId: v })}>
                        <SelectTrigger size="sm" className={!l.disciplinaId ? "border-destructive" : undefined}>
                          <SelectValue placeholder="—">
                            {(v: string) => catalogo.disciplinas.find((d) => d.id === v)?.name ?? "—"}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {catalogo.disciplinas.map((d) => (
                            <SelectItem key={d.id} value={d.id}>
                              {d.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <Button onClick={handleConfirmarImportacao} disabled={pending || totalSelecionadas === 0}>
            {pending ? "Importando..." : `Importar ${totalSelecionadas} documento(s)`}
          </Button>
        </div>
      )}

      {etapa === "concluido" && resultado && (
        <div className="max-w-md space-y-4 rounded-lg border p-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <CheckCircle2 className="size-5 shrink-0 text-emerald-600" />
            {resultado.criados} documento(s) criado(s) com sucesso.
          </div>
          {resultado.erros.length > 0 && (
            <div className="space-y-1">
              <p className="flex items-center gap-1.5 text-sm font-medium text-destructive">
                <AlertTriangle className="size-4 shrink-0" />
                {resultado.erros.length} linha(s) falharam:
              </p>
              <ul className="space-y-1 text-xs text-muted-foreground">
                {resultado.erros.map((e, i) => (
                  <li key={i}>
                    {e.descricao}: {e.erro}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {obraId && obraProjetoId && (
            <Link
              href={`/workspaces/${workspaceId}/projetos/${obraProjetoId}/obras/${obraId}`}
              className="text-sm text-primary hover:underline"
            >
              Ver documentos importados →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
