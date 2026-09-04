import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { documentos, secoes, obraDisciplinas } from "@/db/schema";
import { newId } from "@/lib/id";
import { badRequest, isUniqueViolation, conflict } from "@/lib/errors";
import { STATUS_LABELS, type StatusDocumento } from "@/lib/statusGraph";
import { normalizar, celulaTexto, carregarWorkbook, garantirObraDisciplina, garantirTipoDocumento } from "./importDocumentosService";

// Formato esperado na planilha de sincronização com o GED do cliente — bem diferente do
// formato "Lista de Documentos" (ITEM/DESCRIÇÃO/DISCIPLINA) já suportado pelo import
// original: aqui não tem Disciplina nem Seção — só um registro plano por documento, no
// formato que sistemas de GED (ACC, etc.) costumam exportar (Código, Descrição, Status,
// Revisão, Data de alteração do status, GED de origem).
const TAMANHO_MAXIMO_BYTES = 15 * 1024 * 1024; // 15MB

export async function listarAbasPlanilhaGed(buffer: Buffer): Promise<string[]> {
  if (buffer.byteLength > TAMANHO_MAXIMO_BYTES) throw badRequest("ARQUIVO_MUITO_GRANDE", "O arquivo passa de 15MB.");
  const workbook = carregarWorkbook(buffer);
  return workbook.SheetNames;
}

export type LinhaGedImportada = {
  codigo: string;
  descricao: string;
  statusTexto: string;
  revisao: string;
  dataAlteracao: string | null; // ISO yyyy-mm-dd, já convertida
  gedOrigem: string;
};

function converterDataExcel(valor: unknown): string | null {
  if (valor == null || valor === "") return null;
  // Excel guarda data como número serial (dias desde 1899-12-30) quando a célula tem
  // formato de data de verdade; texto solto (ex: "17/04/2025") também é aceito.
  if (typeof valor === "number") {
    const ms = Math.round((valor - 25569) * 86400 * 1000);
    return new Date(ms).toISOString().slice(0, 10);
  }
  const texto = String(valor).trim();
  const match = texto.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (match) {
    const [, dd, mm, yyyy] = match;
    return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
  }
  return null;
}

export async function parseLinhasGed(buffer: Buffer, sheetName: string): Promise<LinhaGedImportada[]> {
  const XLSX = await import("xlsx");
  const workbook = carregarWorkbook(buffer);
  const ws = workbook.Sheets[sheetName];
  if (!ws) throw badRequest("ABA_NAO_ENCONTRADA", `A aba "${sheetName}" não existe nessa planilha.`);

  const linhasCruas: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, blankrows: true });

  type ColunasGed = { codigo: number; descricao: number; status: number; revisao: number; dataAlteracao: number; ged: number };
  let indiceCabecalho = -1;
  let colunas: ColunasGed = { codigo: -1, descricao: -1, status: -1, revisao: -1, dataAlteracao: -1, ged: -1 };
  for (let i = 0; i < Math.min(20, linhasCruas.length); i++) {
    const linha = linhasCruas[i];
    if (!linha) continue;
    const achou: Partial<typeof colunas> = {};
    linha.forEach((celula, idx) => {
      const texto = normalizar(celulaTexto(celula));
      if (!texto) return;
      if (texto.includes("CODIGO") || texto.includes("CÓDIGO")) achou.codigo = idx;
      else if (texto.includes("DESCRI")) achou.descricao = idx;
      // "DATA" antes de "STATUS" de propósito: o cabeçalho "Data de alteração do Status"
      // também contém a palavra "STATUS" — checar Data primeiro evita que essa coluna
      // "roube" o índice da coluna Status de verdade.
      else if (texto.includes("DATA")) achou.dataAlteracao = idx;
      else if (texto.includes("STATUS")) achou.status = idx;
      else if (texto.includes("REVIS")) achou.revisao = idx;
      else if (texto.includes("GED")) achou.ged = idx;
    });
    if (achou.codigo !== undefined && achou.descricao !== undefined) {
      indiceCabecalho = i;
      colunas = { codigo: -1, descricao: -1, status: -1, revisao: -1, dataAlteracao: -1, ged: -1, ...achou };
      break;
    }
  }
  if (indiceCabecalho === -1) {
    throw badRequest(
      "CABECALHO_NAO_ENCONTRADO",
      "Não encontrei as colunas esperadas (Código, Descrição...) nas primeiras linhas da planilha."
    );
  }

  const linhas: LinhaGedImportada[] = [];
  for (let i = indiceCabecalho + 1; i < linhasCruas.length; i++) {
    const linha = linhasCruas[i];
    if (!linha) continue;
    const codigo = celulaTexto(linha[colunas.codigo]);
    const descricao = celulaTexto(linha[colunas.descricao]);
    if (!codigo || !descricao) continue; // linha em branco no meio da planilha
    linhas.push({
      codigo,
      descricao,
      statusTexto: colunas.status >= 0 ? celulaTexto(linha[colunas.status]) : "",
      revisao: colunas.revisao >= 0 ? celulaTexto(linha[colunas.revisao]) : "",
      dataAlteracao: colunas.dataAlteracao >= 0 ? converterDataExcel(linha[colunas.dataAlteracao]) : null,
      gedOrigem: colunas.ged >= 0 ? celulaTexto(linha[colunas.ged]) : "",
    });
  }
  return linhas;
}

// Acha, dentro da Descrição, o nome de alguma Seção que já existe nessa obra+disciplina —
// em QUALQUER posição do texto (não só no início). Se mais de uma seção bater, fica com a
// mais específica (nome mais longo). Sem seção conhecida -> null, fica pendente de revisão manual.
export function sugerirSecaoPorDescricao(
  descricao: string,
  secoesDaDisciplina: { id: string; name: string }[]
): string | null {
  const alvo = normalizar(descricao);
  let melhor: { id: string; tamanho: number } | null = null;
  for (const s of secoesDaDisciplina) {
    const nomeNormalizado = normalizar(s.name);
    if (nomeNormalizado.length === 0) continue;
    if (alvo.includes(nomeNormalizado)) {
      if (!melhor || nomeNormalizado.length > melhor.tamanho) melhor = { id: s.id, tamanho: nomeNormalizado.length };
    }
  }
  return melhor?.id ?? null;
}

// Bate o texto de status do GED do cliente contra o nosso enum, por nome (ex: "Liberado
// para Construção" -> liberado_para_construcao). Sem bater com nada -> null, fica pendente.
export function sugerirStatusPorTexto(statusTexto: string): StatusDocumento | null {
  const alvo = normalizar(statusTexto);
  if (!alvo) return null;
  const entradas = Object.entries(STATUS_LABELS) as [StatusDocumento, string][];

  const exato = entradas.find(([, label]) => normalizar(label) === alvo);
  if (exato) return exato[0];

  // GED do cliente pode usar uma palavra só ("Liberado") em vez do nome completo do nosso
  // status ("Liberado para Construção") — casa por conter, mas só se der em UM status só;
  // ambíguo (bate em mais de um) é mais seguro pedir pra escolher na revisão manual.
  const candidatos = entradas.filter(([, label]) => {
    const labelNormalizado = normalizar(label);
    return labelNormalizado.includes(alvo) || alvo.includes(labelNormalizado);
  });
  return candidatos.length === 1 ? candidatos[0][0] : null;
}

export async function analisarLinhasGed(workspaceId: string, obraId: string, disciplinaId: string, linhas: LinhaGedImportada[]) {
  const secoesDaDisciplina = await db
    .select({ id: secoes.id, name: secoes.name })
    .from(secoes)
    .innerJoin(obraDisciplinas, eq(obraDisciplinas.id, secoes.obraDisciplinaId))
    .where(and(eq(obraDisciplinas.obraId, obraId), eq(obraDisciplinas.disciplinaId, disciplinaId)));

  const existentes = await db
    .select({ id: documentos.id, codigoCompleto: documentos.codigoCompleto, status: documentos.status, descricao: documentos.descricao })
    .from(documentos)
    .where(and(eq(documentos.workspaceId, workspaceId), eq(documentos.obraId, obraId), isNull(documentos.deletedAt)));
  const existentePorCodigo = new Map(existentes.map((d) => [d.codigoCompleto.trim().toUpperCase(), d]));

  return linhas.map((linha) => {
    const existente = existentePorCodigo.get(linha.codigo.trim().toUpperCase()) ?? null;
    return {
      ...linha,
      documentoIdExistente: existente?.id ?? null,
      statusAtual: existente?.status ?? null,
      secaoIdSugerida: sugerirSecaoPorDescricao(linha.descricao, secoesDaDisciplina),
      statusSugerido: sugerirStatusPorTexto(linha.statusTexto),
    };
  });
}

export type LinhaGedParaAplicar = {
  codigo: string;
  descricao: string;
  status: StatusDocumento;
  revisao: string;
  dataAlteracao: string | null;
  gedOrigem: string;
  documentoIdExistente: string | null;
  // Só usado quando documentoIdExistente é null — o usuário confirmou que quer criar.
  criar: boolean;
  secaoId: string | null; // obrigatório quando criar = true
};

export async function aplicarSincronizacaoGed(
  workspaceId: string,
  userId: string,
  obraId: string,
  disciplinaId: string,
  faseId: string,
  linhas: LinhaGedParaAplicar[]
) {
  const atualizados: string[] = [];
  const criados: string[] = [];
  const ignorados: { codigo: string; motivo: string }[] = [];

  for (const linha of linhas) {
    try {
      if (linha.documentoIdExistente) {
        await db
          .update(documentos)
          .set({
            descricao: linha.descricao,
            status: linha.status,
            statusUpdatedAt: linha.dataAlteracao ? new Date(linha.dataAlteracao) : new Date(),
            revisaoExterna: linha.revisao || null,
            gedOrigem: linha.gedOrigem || null,
            updatedAt: new Date(),
          })
          .where(eq(documentos.id, linha.documentoIdExistente));
        atualizados.push(linha.codigo);
        continue;
      }

      if (!linha.criar) {
        ignorados.push({ codigo: linha.codigo, motivo: "Não confirmado pra criar." });
        continue;
      }
      if (!linha.secaoId) {
        ignorados.push({ codigo: linha.codigo, motivo: "Sem seção definida." });
        continue;
      }

      await db.insert(documentos).values({
        id: newId("doc"),
        workspaceId,
        obraId,
        disciplinaId,
        secaoId: linha.secaoId,
        faseId,
        tipoDocumentoId: await tipoDaSecao(linha.secaoId, workspaceId),
        sequencial: 0, // código vem pronto do GED — o contador automático não se aplica aqui
        codigoCompleto: linha.codigo,
        descricao: linha.descricao,
        status: linha.status,
        statusUpdatedAt: linha.dataAlteracao ? new Date(linha.dataAlteracao) : new Date(),
        revisaoExterna: linha.revisao || null,
        gedOrigem: linha.gedOrigem || null,
        createdBy: userId,
      });
      criados.push(linha.codigo);
    } catch (err) {
      if (isUniqueViolation(err)) {
        ignorados.push({ codigo: linha.codigo, motivo: "Já existe outro documento com esse código." });
        continue;
      }
      throw err;
    }
  }

  return { atualizados, criados, ignorados };
}

// A Seção já foi (re)aproveitada/criada antes de chegar aqui (garantirSecaoPorTipo) — só
// falta o Tipo, que segue o mesmo nome da Seção (mesmo padrão do import original).
async function tipoDaSecao(secaoId: string, workspaceId: string): Promise<string> {
  const [secao] = await db.select({ name: secoes.name }).from(secoes).where(eq(secoes.id, secaoId)).limit(1);
  if (!secao) throw conflict("SECAO_NOT_FOUND", "Seção não encontrada.");
  return garantirTipoDocumento(workspaceId, secao.name);
}

export { garantirObraDisciplina };
