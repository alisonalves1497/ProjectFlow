"use client";

import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  CheckCircle2,
  AlertTriangle,
  Upload,
  FileSpreadsheet,
  FolderKanban,
  RefreshCw,
  ListChecks,
  ShieldCheck,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { STATUS_LABELS, type StatusDocumento } from "@/lib/statusGraph";
import {
  listarAbasPortfolioAction,
  resumirPortfolioAction,
  analisarPortfolioAction,
  confirmarSincronizacaoPortfolioAction,
} from "./actions";

type Etapa = "config" | "grupos" | "resolucao" | "confirmacao" | "concluido";

type Grupo = { contrato: string; sistema: string; quantidade: number; projetoExiste: boolean; obraExiste: boolean };

type LinhaAnalisada = {
  contrato: string;
  sistema: string;
  codigo: string;
  tipo: string;
  coordenacao: string;
  dataPrevista: string | null;
  projetista: string;
  statusTexto: string;
  revisao: string;
  dataAlteracao: string | null;
  gedOrigem: string;
  documentoIdExistente: string | null;
  statusAtual: StatusDocumento | null;
  secaoNomeSugerida: string | null;
  statusSugerido: StatusDocumento | null;
  responsavelIdSugerido: string | null;
};

type Resultado = { atualizados: string[]; criados: string[]; ignorados: { codigo: string; motivo: string }[] };

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

export function SincronizarPortfolioWizard({ workspaceId }: { workspaceId: string }) {
  const [etapa, setEtapa] = useState<Etapa>("config");
  const [pending, setPending] = useState(false);

  const [arquivo, setArquivo] = useState<File | null>(null);
  const [arquivoBase64, setArquivoBase64] = useState("");
  const [abas, setAbas] = useState<string[]>([]);
  const [sheetName, setSheetName] = useState("");
  const [erroArquivo, setErroArquivo] = useState<string | null>(null);
  // Protege contra o usuário trocar de arquivo antes da leitura anterior terminar — só o
  // resultado da seleção mais recente pode atualizar o estado.
  const selecaoAtual = useRef(0);

  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [gruposSelecionados, setGruposSelecionados] = useState<Set<string>>(new Set());

  const [linhas, setLinhas] = useState<LinhaAnalisada[]>([]);
  const [membros, setMembros] = useState<{ userId: string; name: string | null }[]>([]);

  const [resolvedSecao, setResolvedSecao] = useState<Record<string, string>>({});
  const [resolvedStatus, setResolvedStatus] = useState<Record<string, StatusDocumento | "">>({});
  const [resolvedResponsavel, setResolvedResponsavel] = useState<Record<string, string>>({});

  const [obraCriarFlags, setObraCriarFlags] = useState<Record<string, boolean>>({});

  const [resultado, setResultado] = useState<Resultado | null>(null);

  function chaveGrupo(contrato: string, sistema: string) {
    return `${contrato}|${sistema}`;
  }

  async function onArquivoSelecionado(file: File | null) {
    const minhaSelecao = ++selecaoAtual.current;
    setArquivo(file);
    setAbas([]);
    setSheetName("");
    setArquivoBase64("");
    setErroArquivo(null);
    if (!file) return;
    setPending(true);
    try {
      const base64 = await arquivoParaBase64(file);
      const res = await listarAbasPortfolioAction(workspaceId, base64);
      if (minhaSelecao !== selecaoAtual.current) return; // trocou de arquivo enquanto lia — descarta

      if (!res.ok) {
        setErroArquivo(res.error);
        return;
      }
      if (res.data.length === 0) {
        setErroArquivo("Não encontrei nenhuma aba nesse arquivo.");
        return;
      }
      setArquivoBase64(base64);
      setAbas(res.data);
      setSheetName(res.data[0] ?? "");
    } catch {
      if (minhaSelecao === selecaoAtual.current) setErroArquivo("Não consegui ler esse arquivo. Tente selecionar de novo.");
    } finally {
      if (minhaSelecao === selecaoAtual.current) setPending(false);
    }
  }

  async function irParaGrupos() {
    if (!arquivoBase64 || !sheetName) {
      toast.error("Escolha o arquivo antes de continuar.");
      return;
    }
    setPending(true);
    try {
      const res = await resumirPortfolioAction(workspaceId, arquivoBase64, sheetName);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setGrupos(res.data.grupos);
      // Todo grupo já vem marcado — quem não é documento de verdade (linha "separadora"),
      // o usuário desmarca aqui olhando a quantidade.
      setGruposSelecionados(new Set(res.data.grupos.map((g) => chaveGrupo(g.contrato, g.sistema))));
      setEtapa("grupos");
    } catch {
      toast.error("Não consegui analisar a planilha. Tente de novo.");
    } finally {
      setPending(false);
    }
  }

  function alternarGrupo(chave: string) {
    setGruposSelecionados((prev) => {
      const proximo = new Set(prev);
      if (proximo.has(chave)) proximo.delete(chave);
      else proximo.add(chave);
      return proximo;
    });
  }

  async function irParaResolucao() {
    if (gruposSelecionados.size === 0) {
      toast.error("Selecione pelo menos uma combinação Contrato/Sistema.");
      return;
    }
    setPending(true);
    try {
      const gruposParaEnviar = grupos
        .filter((g) => gruposSelecionados.has(chaveGrupo(g.contrato, g.sistema)))
        .map((g) => ({ contrato: g.contrato, sistema: g.sistema }));
      const res = await analisarPortfolioAction(workspaceId, arquivoBase64, sheetName, gruposParaEnviar);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setLinhas(res.data.linhas);
      setMembros(res.data.membros);
      setObraCriarFlags(
        Object.fromEntries(gruposParaEnviar.map((g) => [chaveGrupo(g.contrato, g.sistema), true]))
      );
      setEtapa("resolucao");
    } catch {
      toast.error("Não consegui analisar as linhas selecionadas. Tente de novo.");
    } finally {
      setPending(false);
    }
  }

  // Grupos de resolução única: cada texto distinto que não bateu automaticamente só
  // precisa ser resolvido UMA vez, mesmo aparecendo em centenas de linhas.
  const gruposSecaoPendentes = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const l of linhas) {
      if (!l.documentoIdExistente && !l.secaoNomeSugerida) mapa.set(l.tipo, (mapa.get(l.tipo) ?? 0) + 1);
    }
    return [...mapa.entries()].sort((a, b) => b[1] - a[1]);
  }, [linhas]);

  const gruposStatusPendentes = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const l of linhas) {
      if (!l.statusSugerido && l.statusTexto) mapa.set(l.statusTexto, (mapa.get(l.statusTexto) ?? 0) + 1);
    }
    return [...mapa.entries()].sort((a, b) => b[1] - a[1]);
  }, [linhas]);

  const gruposResponsavelPendentes = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const l of linhas) {
      if (!l.responsavelIdSugerido && l.projetista) mapa.set(l.projetista, (mapa.get(l.projetista) ?? 0) + 1);
    }
    return [...mapa.entries()].sort((a, b) => b[1] - a[1]);
  }, [linhas]);

  const resolucaoCompleta =
    gruposSecaoPendentes.every(([tipo]) => resolvedSecao[tipo]?.trim()) &&
    gruposStatusPendentes.every(([texto]) => resolvedStatus[texto]);

  function irParaConfirmacao() {
    if (!resolucaoCompleta) {
      toast.error("Ainda tem Seção ou Status sem definir — resolve todos antes de continuar.");
      return;
    }
    setEtapa("confirmacao");
  }

  const resumoPorObra = useMemo(() => {
    const mapa = new Map<string, { contrato: string; sistema: string; atualizar: number; criar: number }>();
    for (const l of linhas) {
      const chave = chaveGrupo(l.contrato, l.sistema);
      if (!mapa.has(chave)) mapa.set(chave, { contrato: l.contrato, sistema: l.sistema, atualizar: 0, criar: 0 });
      const item = mapa.get(chave)!;
      if (l.documentoIdExistente) item.atualizar++;
      else item.criar++;
    }
    return [...mapa.values()];
  }, [linhas]);

  const totalAtualizar = resumoPorObra.reduce((acc, o) => acc + o.atualizar, 0);
  const totalCriar = resumoPorObra.reduce(
    (acc, o) => acc + (obraCriarFlags[chaveGrupo(o.contrato, o.sistema)] ? o.criar : 0),
    0
  );

  async function confirmar() {
    setPending(true);
    try {
      const linhasParaAplicar = linhas
        .map((l) => {
          const secaoNome = l.secaoNomeSugerida ?? resolvedSecao[l.tipo] ?? null;
          const status = l.statusSugerido ?? (resolvedStatus[l.statusTexto] || null);
          const responsavelId = l.responsavelIdSugerido ?? (l.projetista ? resolvedResponsavel[l.projetista] || null : null);
          const chave = chaveGrupo(l.contrato, l.sistema);
          const criar = l.documentoIdExistente ? false : obraCriarFlags[chave] ?? false;
          return {
            contrato: l.contrato,
            sistema: l.sistema,
            codigo: l.codigo,
            tipo: l.tipo,
            coordenacao: l.coordenacao,
            dataPrevista: l.dataPrevista,
            status: (status ?? "previsto") as StatusDocumento,
            revisao: l.revisao,
            dataAlteracao: l.dataAlteracao,
            gedOrigem: l.gedOrigem,
            documentoIdExistente: l.documentoIdExistente,
            criar,
            secaoNome,
            responsavelId,
          };
        })
        .filter((l) => l.documentoIdExistente || l.criar);

      const res = await confirmarSincronizacaoPortfolioAction(workspaceId, linhasParaAplicar);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setResultado(res.data);
      setEtapa("concluido");
    } catch {
      toast.error("Não consegui aplicar a sincronização. Tente de novo.");
    } finally {
      setPending(false);
    }
  }

  function reiniciar() {
    setEtapa("config");
    setArquivo(null);
    setArquivoBase64("");
    setAbas([]);
    setSheetName("");
    setErroArquivo(null);
    setGrupos([]);
    setGruposSelecionados(new Set());
    setLinhas([]);
    setResolvedSecao({});
    setResolvedStatus({});
    setResolvedResponsavel({});
    setObraCriarFlags({});
    setResultado(null);
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
          <div className="max-h-64 overflow-y-auto rounded-md border p-3 text-sm">
            <p className="mb-2 font-medium text-muted-foreground">Ignorados:</p>
            <ul className="space-y-1">
              {resultado.ignorados.map((i, idx) => (
                <li key={`${i.codigo}-${idx}`} className="font-mono text-xs text-muted-foreground">
                  {i.codigo} — {i.motivo}
                </li>
              ))}
            </ul>
          </div>
        )}
        <Button type="button" onClick={reiniciar}>
          Sincronizar outra planilha
        </Button>
      </div>
    );
  }

  if (etapa === "confirmacao") {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {totalAtualizar} documento{totalAtualizar !== 1 ? "s" : ""} vão ser atualizados. Documento novo só entra na obra
          que você confirmar abaixo.
        </p>
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contrato</TableHead>
                <TableHead>Sistema (Obra)</TableHead>
                <TableHead className="w-28 text-right">Atualizar</TableHead>
                <TableHead className="w-64">Criar documentos novos</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {resumoPorObra.map((o) => {
                const chave = chaveGrupo(o.contrato, o.sistema);
                return (
                  <TableRow key={chave}>
                    <TableCell className="text-sm">{o.contrato}</TableCell>
                    <TableCell className="text-sm">{o.sistema}</TableCell>
                    <TableCell className="text-right text-sm">{o.atualizar}</TableCell>
                    <TableCell>
                      {o.criar > 0 ? (
                        <label className="flex items-center gap-1.5 text-xs">
                          <input
                            type="checkbox"
                            className="checkbox-custom"
                            checked={obraCriarFlags[chave] ?? false}
                            onChange={(e) => setObraCriarFlags((prev) => ({ ...prev, [chave]: e.target.checked }))}
                          />
                          Criar {o.criar} documento{o.criar !== 1 ? "s" : ""} novo{o.criar !== 1 ? "s" : ""}
                        </label>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" onClick={() => setEtapa("resolucao")} disabled={pending}>
            Voltar
          </Button>
          <Button type="button" onClick={confirmar} disabled={pending}>
            {pending ? "Aplicando..." : `Confirmar (${totalAtualizar + totalCriar})`}
          </Button>
        </div>
      </div>
    );
  }

  if (etapa === "resolucao") {
    return (
      <div className="space-y-6">
        {gruposStatusPendentes.length > 0 && (
          <div>
            <h2 className="mb-2 text-sm font-semibold">Status sem correspondência ({gruposStatusPendentes.length})</h2>
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Texto na planilha</TableHead>
                    <TableHead className="w-24 text-right">Linhas</TableHead>
                    <TableHead className="w-64">Corresponde a</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {gruposStatusPendentes.map(([texto, qtd]) => (
                    <TableRow key={texto}>
                      <TableCell className="text-sm">{texto}</TableCell>
                      <TableCell className="text-right text-sm">{qtd}</TableCell>
                      <TableCell>
                        <select
                          value={resolvedStatus[texto] ?? ""}
                          onChange={(e) => setResolvedStatus((prev) => ({ ...prev, [texto]: e.target.value as StatusDocumento }))}
                          className={`h-8 w-full rounded-md border bg-transparent px-1.5 text-xs ${!resolvedStatus[texto] ? "border-amber-500" : ""}`}
                        >
                          <option value="">— escolher —</option>
                          {Object.entries(STATUS_LABELS).map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {gruposSecaoPendentes.length > 0 && (
          <div>
            <h2 className="mb-2 text-sm font-semibold">Seção sem correspondência ({gruposSecaoPendentes.length})</h2>
            <p className="mb-2 text-xs text-muted-foreground">Só aparece aqui o que seria documento novo — atualização não precisa de Seção.</p>
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo na planilha</TableHead>
                    <TableHead className="w-24 text-right">Linhas</TableHead>
                    <TableHead className="w-64">Seção</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {gruposSecaoPendentes.map(([tipo, qtd]) => (
                    <TableRow key={tipo}>
                      <TableCell className="truncate text-sm">{tipo}</TableCell>
                      <TableCell className="text-right text-sm">{qtd}</TableCell>
                      <TableCell>
                        <input
                          type="text"
                          value={resolvedSecao[tipo] ?? ""}
                          onChange={(e) => setResolvedSecao((prev) => ({ ...prev, [tipo]: e.target.value }))}
                          placeholder="Nome da seção"
                          className={`h-8 w-full rounded-md border bg-transparent px-1.5 text-xs ${!resolvedSecao[tipo]?.trim() ? "border-amber-500" : ""}`}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {gruposResponsavelPendentes.length > 0 && (
          <div>
            <h2 className="mb-2 text-sm font-semibold">Responsável sem correspondência ({gruposResponsavelPendentes.length})</h2>
            <p className="mb-2 text-xs text-muted-foreground">Opcional — deixando em branco, o documento fica sem responsável atribuído.</p>
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome na planilha</TableHead>
                    <TableHead className="w-24 text-right">Linhas</TableHead>
                    <TableHead className="w-64">Membro</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {gruposResponsavelPendentes.map(([nome, qtd]) => (
                    <TableRow key={nome}>
                      <TableCell className="text-sm">{nome}</TableCell>
                      <TableCell className="text-right text-sm">{qtd}</TableCell>
                      <TableCell>
                        <select
                          value={resolvedResponsavel[nome] ?? ""}
                          onChange={(e) => setResolvedResponsavel((prev) => ({ ...prev, [nome]: e.target.value }))}
                          className="h-8 w-full rounded-md border bg-transparent px-1.5 text-xs"
                        >
                          <option value="">— sem responsável —</option>
                          {membros.map((m) => (
                            <option key={m.userId} value={m.userId}>
                              {m.name ?? m.userId}
                            </option>
                          ))}
                        </select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {gruposSecaoPendentes.length === 0 && gruposStatusPendentes.length === 0 && gruposResponsavelPendentes.length === 0 && (
          <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 p-4 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-400">
            <CheckCircle2 className="size-5 shrink-0" />
            <p className="text-sm">Tudo bateu automaticamente — nenhuma resolução manual necessária.</p>
          </div>
        )}

        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" onClick={() => setEtapa("grupos")} disabled={pending}>
            Voltar
          </Button>
          <Button type="button" onClick={irParaConfirmacao} disabled={pending || !resolucaoCompleta}>
            Continuar
          </Button>
          {!resolucaoCompleta && (
            <span className="flex items-center gap-1 text-xs text-amber-600">
              <AlertTriangle className="size-3.5" />
              Resolve tudo em amarelo antes de continuar.
            </span>
          )}
        </div>
      </div>
    );
  }

  if (etapa === "grupos") {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {gruposSelecionados.size} de {grupos.length} combinações selecionadas. Desmarque o que não é documento de
          verdade (ex: linha usada só pra separar a tabela).
        </p>
        <div className="max-h-[60vh] overflow-y-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10"></TableHead>
                <TableHead>Contrato</TableHead>
                <TableHead>Sistema</TableHead>
                <TableHead className="w-24 text-right">Linhas</TableHead>
                <TableHead className="w-40">Projeto</TableHead>
                <TableHead className="w-40">Obra</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {grupos.map((g) => {
                const chave = chaveGrupo(g.contrato, g.sistema);
                return (
                  <TableRow key={chave}>
                    <TableCell>
                      <input
                        type="checkbox"
                        className="checkbox-custom"
                        checked={gruposSelecionados.has(chave)}
                        onChange={() => alternarGrupo(chave)}
                      />
                    </TableCell>
                    <TableCell className="text-sm">{g.contrato}</TableCell>
                    <TableCell className="text-sm">{g.sistema}</TableCell>
                    <TableCell className="text-right text-sm">{g.quantidade}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{g.projetoExiste ? "já existe" : "será criado"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{g.obraExiste ? "já existe" : "será criada"}</TableCell>
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
          <Button type="button" onClick={irParaResolucao} disabled={pending}>
            {pending ? "Lendo..." : "Continuar"}
          </Button>
        </div>
      </div>
    );
  }

  const PASSOS = [
    { icon: FileSpreadsheet, titulo: "Envie a planilha", texto: "Uma aba com Contrato, Sistema, Código, Tipo e Status." },
    { icon: FolderKanban, titulo: "Escolha as obras", texto: "Marque quais combinações Contrato/Sistema entram na sincronização." },
    { icon: ListChecks, titulo: "Resolva as pendências", texto: "Seção, Status ou Responsável que não bateram sozinhos — uma vez só, não linha por linha." },
    { icon: ShieldCheck, titulo: "Confirme por obra", texto: "Documento novo só entra depois de você aprovar, obra por obra." },
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <Upload className="size-4" />
            1. Enviar planilha
          </CardTitle>
          <CardDescription>Aceita .xlsx, .xls ou .xlsm — até 25MB.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <label
            htmlFor="arquivo"
            className={cn(
              "flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed px-6 py-8 text-center transition-colors",
              erroArquivo
                ? "border-destructive/40 bg-destructive/5"
                : arquivo
                  ? "border-primary/40 bg-primary/5"
                  : "border-border hover:border-primary/40 hover:bg-accent/50"
            )}
          >
            <Upload className={cn("size-6", arquivo ? "text-primary" : "text-muted-foreground")} />
            <span className="text-sm font-medium">{pending ? "Lendo arquivo…" : "Clique para escolher o arquivo"}</span>
            <span className="text-xs text-muted-foreground">ou arraste aqui</span>
          </label>
          <input
            id="arquivo"
            type="file"
            accept=".xlsx,.xls,.xlsm"
            className="sr-only"
            onChange={(e) => onArquivoSelecionado(e.target.files?.[0] ?? null)}
          />

          {arquivo && (
            <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm">
              <FileSpreadsheet className="size-4 shrink-0 text-primary" />
              <span className="min-w-0 flex-1 truncate">{arquivo.name}</span>
              <button
                type="button"
                onClick={() => onArquivoSelecionado(null)}
                className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground"
                title="Remover arquivo"
              >
                <X className="size-3.5" />
              </button>
            </div>
          )}

          {erroArquivo && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <span>{erroArquivo}</span>
            </div>
          )}

          {abas.length > 1 && (
            <div className="space-y-1.5">
              <Label htmlFor="sheetName">Aba</Label>
              <select
                id="sheetName"
                value={sheetName}
                onChange={(e) => setSheetName(e.target.value)}
                className="h-9 w-full rounded-md border bg-transparent px-3 text-sm"
              >
                {abas.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>
          )}

          <Button type="button" onClick={irParaGrupos} disabled={pending || !arquivoBase64} className="w-full">
            <RefreshCw className="size-4" />
            {pending ? "Lendo…" : "Analisar planilha"}
          </Button>
        </CardContent>
      </Card>

      <Card size="sm" className="bg-muted/30">
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground uppercase tracking-wide">Como funciona</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-4">
            {PASSOS.map((passo, idx) => (
              <li key={passo.titulo} className="flex gap-3">
                <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {idx + 1}
                </div>
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-sm font-medium">
                    <passo.icon className="size-3.5 text-primary/70" />
                    {passo.titulo}
                  </p>
                  <p className="text-xs text-muted-foreground">{passo.texto}</p>
                </div>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
