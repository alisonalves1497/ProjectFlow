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

function normalizar(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toUpperCase();
}

function celulaTexto(valor: unknown): string {
  if (valor == null) return "";
  return String(valor).trim();
}

function carregarWorkbook(buffer: Buffer): XLSX.WorkBook {
  if (buffer.byteLength > TAMANHO_MAXIMO_BYTES) {
    throw badRequest("ARQUIVO_MUITO_GRANDE", "Arquivo maior que 15MB — não suportado.");
  }
  return XLSX.read(buffer, { type: "buffer" });
}

export async function listarAbasPlanilha(buffer: Buffer): Promise<string[]> {
  const workbook = carregarWorkbook(buffer);
  return workbook.SheetNames;
}

export type LinhaImportada = {
  linha: number;
  descricao: string;
  disciplinaTexto: string;
  secaoExcel: string | null;
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
  let secaoAtual: string | null = null;

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

// Heurística simples: qualquer palavra do nome do Tipo (>=4 letras) que apareça na
// descrição do documento conta como sinal. Fica com o Tipo de maior pontuação; empate
// ou nenhum sinal → null (usuário escolhe na revisão).
export function sugerirTipoDocumentoId(descricao: string, tipos: { id: string; name: string }[]): string | null {
  const desc = normalizar(descricao);
  let melhor: { id: string; pontos: number } | null = null;
  for (const tipo of tipos) {
    const palavras = normalizar(tipo.name)
      .split(/[^A-Z0-9]+/)
      .filter((p) => p.length >= 4);
    const pontos = palavras.filter((p) => desc.includes(p)).length;
    if (pontos > 0 && (!melhor || pontos > melhor.pontos)) melhor = { id: tipo.id, pontos };
  }
  return melhor?.id ?? null;
}

async function garantirObraDisciplina(obraId: string, disciplinaId: string) {
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
async function garantirSecaoPorTipo(obraDisciplinaId: string, tipoNome: string, posicao: number) {
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
  disciplinaId: string;
  tipoDocumentoId: string;
  faseId: string;
};

export async function importarDocumentos(workspaceId: string, userId: string, obraId: string, linhas: LinhaParaImportar[]) {
  const criados: string[] = [];
  const erros: { descricao: string; erro: string }[] = [];

  // Cache pra não reconsultar obraDisciplina/seção a cada linha do mesmo tipo.
  const obraDisciplinaCache = new Map<string, string>();
  const secaoCache = new Map<string, string>();
  const tiposNome = new Map<string, string>();
  let proximaPosicaoSecao = 1;

  for (const linha of linhas) {
    try {
      let odId = obraDisciplinaCache.get(linha.disciplinaId);
      if (!odId) {
        const od = await garantirObraDisciplina(obraId, linha.disciplinaId);
        odId = od.id;
        obraDisciplinaCache.set(linha.disciplinaId, odId);
      }

      let tipoNome = tiposNome.get(linha.tipoDocumentoId);
      if (!tipoNome) {
        const [tipo] = await db.select({ name: tiposDocumento.name }).from(tiposDocumento).where(eq(tiposDocumento.id, linha.tipoDocumentoId)).limit(1);
        tipoNome = tipo?.name ?? "Documentos";
        tiposNome.set(linha.tipoDocumentoId, tipoNome);
      }

      const secaoCacheKey = `${odId}:${linha.tipoDocumentoId}`;
      let secaoId = secaoCache.get(secaoCacheKey);
      if (!secaoId) {
        const secao = await garantirSecaoPorTipo(odId, tipoNome, proximaPosicaoSecao++);
        secaoId = secao.id;
        secaoCache.set(secaoCacheKey, secaoId);
      }

      const documento = await createDocumento(workspaceId, userId, {
        obraId,
        disciplinaId: linha.disciplinaId,
        secaoId,
        faseId: linha.faseId,
        tipoDocumentoId: linha.tipoDocumentoId,
        descricao: linha.descricao,
      });
      criados.push(documento.id);
    } catch (err) {
      erros.push({ descricao: linha.descricao, erro: err instanceof Error ? err.message : "Erro desconhecido." });
    }
  }

  return { criados: criados.length, erros };
}
