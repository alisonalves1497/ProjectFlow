import * as XLSX from "xlsx";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { disciplinas, tiposDocumento, fases, obraDisciplinas, secoes } from "@/db/schema";
import { newId } from "@/lib/id";
import { badRequest } from "@/lib/errors";
import { createDocumento } from "./documentoService";

// Cabeçalhos aceitos hoje: planilhas de "Lista de Documentos" no formato
// ITEM | Nº DOCUMENTO | DESCRIÇÃO | DISCIPLINA | ... — mesmo padrão usado nas abas
// "CIVIL"/"PE" do modelo que a Mariana mandou. Outros layouts (ex: aba "GERAL", com
// colunas de acompanhamento por envio) não são suportados por enquanto.
//
// Usa a lib "xlsx" (SheetJS) — não a "exceljs": testado direto contra um arquivo real
// de ~330KB com gráficos embutidos, exceljs travava (>2min sem terminar) tentando
// interpretar os desenhos/gráficos; xlsx leu o mesmo arquivo em ~100ms.
const COLUNAS_ESPERADAS = { item: "ITEM", descricao: "DESCRI", disciplina: "DISCIPLINA" };

const TAMANHO_MAXIMO_BYTES = 15 * 1024 * 1024; // 15MB

export function normalizar(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toUpperCase();
}

// Disciplina sempre com só a primeira letra maiúscula (ex: "CIVIL"/"civil" vindo da planilha
// viram "Civil") — decisão de padronização, não é per-palavra tipo Title Case.
function formatarNomeDisciplina(nome: string): string {
  const limpo = nome.trim().toLowerCase();
  return limpo.charAt(0).toUpperCase() + limpo.slice(1);
}

export function celulaTexto(valor: unknown): string {
  if (valor == null) return "";
  return String(valor).trim();
}

export function carregarWorkbook(buffer: Buffer): XLSX.WorkBook {
  if (buffer.byteLength > TAMANHO_MAXIMO_BYTES) {
    throw badRequest("ARQUIVO_MUITO_GRANDE", "Arquivo maior que 15MB — não suportado.");
  }
  return XLSX.read(buffer, { type: "buffer" });
}

export async function listarAbasPlanilha(buffer: Buffer): Promise<string[]> {
  const workbook = carregarWorkbook(buffer);
  return workbook.SheetNames;
}

const SEM_SECAO = "Sem seção";

export type LinhaImportada = {
  linha: number;
  descricao: string;
  disciplinaTexto: string;
  secaoExcel: string;
};

// Acha a linha de cabeçalho (procurando "DESCRIÇÃO" e "DISCIPLINA" nas primeiras ~20
// linhas) e a partir dali separa: linhas de título de seção (só ITEM preenchido) das
// linhas de documento de verdade (DESCRIÇÃO e DISCIPLINA preenchidos).
export async function parseListaDocumentos(buffer: Buffer, sheetName: string): Promise<LinhaImportada[]> {
  const workbook = carregarWorkbook(buffer);
  const ws = workbook.Sheets[sheetName];
  if (!ws) throw badRequest("ABA_NAO_ENCONTRADA", `Aba '${sheetName}' não encontrada na planilha.`);

  const linhasBrutas: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, blankrows: true });

  let headerRowIdx = -1;
  let colItem = -1;
  let colDescricao = -1;
  let colDisciplina = -1;

  for (let r = 0; r < Math.min(linhasBrutas.length, 20); r++) {
    const row = linhasBrutas[r] ?? [];
    let foundDesc = -1;
    let foundDisc = -1;
    let foundItem = -1;
    row.forEach((cell, colIdx) => {
      const texto = normalizar(celulaTexto(cell));
      if (texto.startsWith(COLUNAS_ESPERADAS.descricao)) foundDesc = colIdx;
      if (texto === COLUNAS_ESPERADAS.disciplina) foundDisc = colIdx;
      if (texto === COLUNAS_ESPERADAS.item) foundItem = colIdx;
    });
    if (foundDesc >= 0 && foundDisc >= 0) {
      headerRowIdx = r;
      colDescricao = foundDesc;
      colDisciplina = foundDisc;
      colItem = foundItem;
      break;
    }
  }

  if (headerRowIdx < 0) {
    throw badRequest(
      "LAYOUT_NAO_RECONHECIDO",
      "Não encontrei as colunas 'DESCRIÇÃO' e 'DISCIPLINA' nas primeiras linhas dessa aba — layout não suportado ainda."
    );
  }

  const linhas: LinhaImportada[] = [];
  let secaoAtual: string = SEM_SECAO;

  for (let r = headerRowIdx + 1; r < linhasBrutas.length; r++) {
    const row = linhasBrutas[r] ?? [];
    const descricao = celulaTexto(row[colDescricao]);
    const disciplinaTexto = celulaTexto(row[colDisciplina]);
    const itemTexto = colItem >= 0 ? celulaTexto(row[colItem]) : "";

    if (descricao && disciplinaTexto) {
      linhas.push({ linha: r + 1, descricao, disciplinaTexto, secaoExcel: secaoAtual });
    } else if (itemTexto && !descricao) {
      // Linha de título de seção (ex: "1.1  Investigação do Solo...") — o título fica
      // na coluna logo depois do ITEM (mesma posição de "Nº DOCUMENTO" nas linhas de
      // documento). Só guarda pra referência visual, não vira Seção automaticamente
      // (isso é feito pelo Tipo).
      const colTitulo = colItem + 1;
      const titulo = colTitulo !== colDescricao ? celulaTexto(row[colTitulo]) : "";
      secaoAtual = titulo || itemTexto;
    }
  }

  return linhas;
}

export async function sugerirCatalogo(workspaceId: string) {
  const [disc, tipos, todasFases] = await Promise.all([
    db.select().from(disciplinas).where(eq(disciplinas.workspaceId, workspaceId)),
    db.select().from(tiposDocumento).where(eq(tiposDocumento.workspaceId, workspaceId)),
    db.select().from(fases).where(eq(fases.workspaceId, workspaceId)),
  ]);
  return { disciplinas: disc, tipos, fases: todasFases };
}

export function sugerirDisciplinaId(disciplinaTexto: string, disciplinas: { id: string; name: string; code: string }[]): string | null {
  const alvo = normalizar(disciplinaTexto);
  const match = disciplinas.find((d) => normalizar(d.name) === alvo || normalizar(d.code) === alvo);
  return match?.id ?? null;
}

// Reaproveita uma Disciplina existente com esse nome (comparação normalizada) ou cria
// uma nova — mesma lógica de garantirTipoDocumento, usada quando o catálogo do
// workspace ainda não tem a Disciplina que aparece na planilha (ex: workspace novo,
// sem nenhum catálogo cadastrado ainda).
export async function garantirDisciplina(workspaceId: string, nome: string): Promise<string> {
  const existentes = await db.select().from(disciplinas).where(eq(disciplinas.workspaceId, workspaceId));
  const alvo = normalizar(nome);
  const match = existentes.find((d) => normalizar(d.name) === alvo || normalizar(d.code) === alvo);
  if (match) return match.id;

  const code = gerarCodigoTipo(nome, new Set(existentes.map((d) => d.code)));
  const [created] = await db
    .insert(disciplinas)
    .values({ id: newId("disc"), workspaceId, code, name: formatarNomeDisciplina(nome) })
    .returning();
  return created.id;
}

// A seção numerada do Excel ("1.1 Investigação do Solo...", "1.2 Fundações - 230 kV"...)
// é usada como o Tipo de documento em si — se já existe um Tipo com esse nome no
// catálogo, reaproveita; senão, fica marcado pra criar um novo com esse mesmo nome
// (ver garantirTipoDocumento). Match exato (normalizado), sem heurística de palavra.
export function sugerirTipoPorNomeSecao(secaoExcel: string, tipos: { id: string; name: string }[]): string | null {
  const alvo = normalizar(secaoExcel);
  const match = tipos.find((t) => normalizar(t.name) === alvo);
  return match?.id ?? null;
}

export type GrupoSecao = { secaoExcel: string; quantidade: number; tipoDocumentoIdSugerido: string | null };

export function agruparPorSecao(linhas: LinhaImportada[], tipos: { id: string; name: string }[]): GrupoSecao[] {
  const contagem = new Map<string, number>();
  for (const l of linhas) contagem.set(l.secaoExcel, (contagem.get(l.secaoExcel) ?? 0) + 1);
  return [...contagem.entries()].map(([secaoExcel, quantidade]) => ({
    secaoExcel,
    quantidade,
    tipoDocumentoIdSugerido: sugerirTipoPorNomeSecao(secaoExcel, tipos),
  }));
}

function gerarCodigoTipo(nome: string, codigosExistentes: Set<string>): string {
  const base = normalizar(nome).replace(/[^A-Z0-9]/g, "").slice(0, 6) || "TIPO";
  let candidato = base;
  let n = 1;
  while (codigosExistentes.has(candidato)) {
    n++;
    candidato = `${base}${n}`;
  }
  return candidato;
}

// Reaproveita um Tipo de documento existente com esse nome (comparação normalizada) ou
// cria um novo — usado quando o usuário aceita a sugestão "criar novo tipo" na revisão.
export async function garantirTipoDocumento(workspaceId: string, nome: string): Promise<string> {
  const existentes = await db.select().from(tiposDocumento).where(eq(tiposDocumento.workspaceId, workspaceId));
  const alvo = normalizar(nome);
  const match = existentes.find((t) => normalizar(t.name) === alvo);
  if (match) return match.id;

  const code = gerarCodigoTipo(nome, new Set(existentes.map((t) => t.code)));
  const [created] = await db.insert(tiposDocumento).values({ id: newId("tipo"), workspaceId, code, name: nome }).returning();
  return created.id;
}

export async function garantirObraDisciplina(obraId: string, disciplinaId: string) {
  const [existing] = await db
    .select()
    .from(obraDisciplinas)
    .where(and(eq(obraDisciplinas.obraId, obraId), eq(obraDisciplinas.disciplinaId, disciplinaId)))
    .limit(1);
  if (existing) return existing;
  const [created] = await db.insert(obraDisciplinas).values({ id: newId("od"), obraId, disciplinaId }).returning();
  return created;
}

// Seção segue o mesmo nome do Tipo de documento (padrão já usado no resto do app —
// ex: "Civil - Sondagem") — reaproveita se já existir pra essa obra+disciplina.
export async function garantirSecaoPorTipo(obraDisciplinaId: string, tipoNome: string, posicao: number) {
  const [existing] = await db
    .select()
    .from(secoes)
    .where(and(eq(secoes.obraDisciplinaId, obraDisciplinaId), eq(secoes.name, tipoNome)))
    .limit(1);
  if (existing) return existing;
  const [created] = await db
    .insert(secoes)
    .values({ id: newId("sec"), obraDisciplinaId, name: tipoNome, position: `a${String(posicao).padStart(4, "0")}` })
    .returning();
  return created;
}

export type LinhaParaImportar = {
  descricao: string;
  // disciplinaId: null => cria (ou reaproveita por nome) uma Disciplina nova chamada disciplinaNome.
  disciplinaId: string | null;
  disciplinaNome: string;
  // tipoDocumentoId: null => cria (ou reaproveita por nome) um Tipo novo chamado tipoNome.
  tipoDocumentoId: string | null;
  tipoNome: string;
  faseId: string;
};

export async function importarDocumentos(workspaceId: string, userId: string, obraId: string, linhas: LinhaParaImportar[]) {
  const criados: string[] = [];
  const erros: { descricao: string; erro: string }[] = [];

  // Caches pra não reconsultar/recriar Disciplina, obraDisciplina, Tipo ou Seção a cada
  // linha do mesmo grupo.
  const disciplinaIdPorNome = new Map<string, string>();
  const obraDisciplinaCache = new Map<string, string>();
  const secaoCache = new Map<string, string>();
  const tipoIdPorNome = new Map<string, string>();
  let proximaPosicaoSecao = 1;

  for (const linha of linhas) {
    try {
      let disciplinaId = linha.disciplinaId;
      if (!disciplinaId) {
        const chaveDisc = normalizar(linha.disciplinaNome);
        disciplinaId = disciplinaIdPorNome.get(chaveDisc) ?? null;
        if (!disciplinaId) {
          disciplinaId = await garantirDisciplina(workspaceId, linha.disciplinaNome);
          disciplinaIdPorNome.set(chaveDisc, disciplinaId);
        }
      }

      let odId = obraDisciplinaCache.get(disciplinaId);
      if (!odId) {
        const od = await garantirObraDisciplina(obraId, disciplinaId);
        odId = od.id;
        obraDisciplinaCache.set(disciplinaId, odId);
      }

      let tipoDocumentoId = linha.tipoDocumentoId;
      if (!tipoDocumentoId) {
        const chave = normalizar(linha.tipoNome);
        tipoDocumentoId = tipoIdPorNome.get(chave) ?? null;
        if (!tipoDocumentoId) {
          tipoDocumentoId = await garantirTipoDocumento(workspaceId, linha.tipoNome);
          tipoIdPorNome.set(chave, tipoDocumentoId);
        }
      }

      const secaoCacheKey = `${odId}:${tipoDocumentoId}`;
      let secaoId = secaoCache.get(secaoCacheKey);
      if (!secaoId) {
        const secao = await garantirSecaoPorTipo(odId, linha.tipoNome, proximaPosicaoSecao++);
        secaoId = secao.id;
        secaoCache.set(secaoCacheKey, secaoId);
      }

      const documento = await createDocumento(workspaceId, userId, {
        obraId,
        disciplinaId,
        secaoId,
        faseId: linha.faseId,
        tipoDocumentoId,
        descricao: linha.descricao,
      });
      criados.push(documento.id);
    } catch (err) {
      erros.push({ descricao: linha.descricao, erro: err instanceof Error ? err.message : "Erro desconhecido." });
    }
  }

  return { criados: criados.length, erros };
}
