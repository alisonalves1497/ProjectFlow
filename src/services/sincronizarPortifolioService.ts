import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { documentos, secoes, secoesPadrao, obraDisciplinas, projetos, obras, fases, workspaceMembers, users, linhaDoTempo } from "@/db/schema";
import { newId } from "@/lib/id";
import { badRequest, isUniqueViolation } from "@/lib/errors";
import { type StatusDocumento } from "@/lib/statusGraph";
import {
  normalizar,
  celulaTexto,
  carregarWorkbook,
  garantirDisciplina,
  garantirObraDisciplina,
  garantirSecaoPorTipo,
  garantirTipoDocumento,
} from "./importDocumentosService";
import { sugerirStatusPorTexto } from "./sincronizarGedService";
import { createProjeto } from "./projetoService";
import { createObra } from "./obraService";

const TAMANHO_MAXIMO_BYTES = 25 * 1024 * 1024; // 25MB — planilha de portfólio é bem maior que a de uma obra só

export async function listarAbasPortifolio(buffer: Buffer): Promise<string[]> {
  if (buffer.byteLength > TAMANHO_MAXIMO_BYTES) throw badRequest("ARQUIVO_MUITO_GRANDE", "O arquivo passa de 25MB.");
  const workbook = carregarWorkbook(buffer);
  return workbook.SheetNames;
}

export type LinhaPortifolio = {
  contrato: string;
  sistema: string;
  codigo: string; // já resolvido: Código2 se tiver, senão Código1
  tipo: string; // descrição do documento (e fonte da Seção)
  coordenacao: string; // disciplina
  dataPrevista: string | null;
  projetista: string;
  statusTexto: string;
  revisao: string;
  dataAlteracao: string | null;
  gedOrigem: string;
};

function converterDataExcel(valor: unknown): string | null {
  if (valor == null || valor === "") return null;
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

// Header tipo "STATUS 08/07/2026" — extrai a data pra decidir qual das (possivelmente
// várias) colunas de status é a mais recente.
function extrairDataDeHeaderStatus(headerTexto: string): Date | null {
  const match = headerTexto.match(/STATUS\s+(\d{1,2})\/(\d{1,2})\/(\d{4})/i);
  if (!match) return null;
  const [, dd, mm, yyyy] = match;
  return new Date(Number(yyyy), Number(mm) - 1, Number(dd));
}

export async function parseLinhasPortifolio(buffer: Buffer, sheetName: string): Promise<LinhaPortifolio[]> {
  const XLSX = await import("xlsx");
  const workbook = carregarWorkbook(buffer);
  const ws = workbook.Sheets[sheetName];
  if (!ws) throw badRequest("ABA_NAO_ENCONTRADA", `A aba "${sheetName}" não existe nessa planilha.`);

  const linhasCruas: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, blankrows: true });
  if (linhasCruas.length === 0) throw badRequest("PLANILHA_VAZIA", "Essa aba está vazia.");

  const header = linhasCruas[0] ?? [];
  let contrato = -1,
    sistema = -1,
    codigo1 = -1,
    codigo2 = -1,
    tipo = -1,
    coordenacao = -1,
    dataPrevista = -1,
    projetista = -1,
    ged = -1,
    revisao = -1,
    dataAlteracao = -1;
  // Pode ter várias colunas "STATUS <data>" (um retrato por dia que a planilha foi
  // atualizada) — junta todas, da mais recente pra mais antiga, porque nem toda linha foi
  // tocada na atualização mais nova (fica em branco lá, mas tem valor numa coluna anterior).
  const colunasStatusPorData: { idx: number; data: Date }[] = [];

  header.forEach((celula, idx) => {
    // Em algumas planilhas (ex: aba "-ENG") a coluna de status por data não tem o texto
    // "STATUS" na frente — o cabeçalho é só a data, formatada como data de verdade no Excel
    // (célula numérica com formato de data, ex: exibe "9/4/26" mas o valor cru é 46269).
    if (typeof celula === "number" && celula > 30000 && celula < 60000) {
      const data = new Date(Math.round((celula - 25569) * 86400 * 1000));
      colunasStatusPorData.push({ idx, data });
      return;
    }
    const texto = normalizar(celulaTexto(celula));
    if (!texto) return;
    const dataDoHeader = extrairDataDeHeaderStatus(texto);
    if (dataDoHeader) {
      colunasStatusPorData.push({ idx, data: dataDoHeader });
      return; // não deixa cair nos outros "includes" abaixo (ex: "STATUS ..." também tem "STATUS")
    }
    if (texto === "CONTRATO") contrato = idx;
    else if (texto === "SISTEMA" && sistema === -1) sistema = idx; // primeira ocorrência = a Obra de verdade
    else if (texto.includes("CODIGO1") || texto.includes("CÓDIGO1")) codigo1 = idx;
    else if ((texto.includes("CODIGO2") || texto.includes("CODIGO 2") || texto.includes("CÓGIDO 2")) && codigo2 === -1) codigo2 = idx;
    else if (texto === "TIPO") tipo = idx;
    else if (texto.includes("COORDENA")) coordenacao = idx;
    else if (texto.includes("DATA PREVIST")) dataPrevista = idx;
    else if (texto === "PROJETISTA") projetista = idx;
    else if (texto.includes("DATA") && texto.includes("ALTERA")) dataAlteracao = idx;
    else if (texto.includes("GED") && ged === -1) ged = idx;
    // "REVISÃO NUMÉRICA?" é outra coluna (sinalizador auxiliar da planilha, não o rótulo de
    // revisão de verdade) — sem excluir ela, "REVIS" bate nela primeiro (some planilhas têm
    // as duas, e essa vem antes da "REVISÃO" de verdade), travando revisao === -1 pra sempre
    // e fazendo o rótulo real da coluna REVISÃO nunca ser usado.
    else if (texto.includes("REVIS") && !texto.includes("NUMERIC") && revisao === -1) revisao = idx;
  });

  if (contrato === -1 || sistema === -1 || (codigo1 === -1 && codigo2 === -1) || tipo === -1) {
    throw badRequest(
      "CABECALHO_NAO_ENCONTRADO",
      "Não encontrei as colunas esperadas (Contrato, Sistema, Código, Tipo...) na primeira linha da planilha."
    );
  }

  // Mais nova primeiro — o cascade abaixo lê nessa ordem e para no primeiro valor não-vazio.
  const colunasStatus = colunasStatusPorData.sort((a, b) => b.data.getTime() - a.data.getTime()).map((c) => c.idx);

  const linhas: LinhaPortifolio[] = [];
  for (let i = 1; i < linhasCruas.length; i++) {
    const linha = linhasCruas[i];
    if (!linha) continue;
    const codigo = celulaTexto(linha[codigo2]) || celulaTexto(linha[codigo1]);
    const tipoTexto = celulaTexto(linha[tipo]);
    // Linha só com Contrato/Sistema preenchidos (sem código nem tipo) é separador visual da
    // planilha, não é um documento — pula.
    if (!codigo || !tipoTexto) continue;

    linhas.push({
      contrato: celulaTexto(linha[contrato]),
      sistema: celulaTexto(linha[sistema]),
      codigo,
      tipo: tipoTexto,
      coordenacao: coordenacao >= 0 ? celulaTexto(linha[coordenacao]) : "",
      dataPrevista: dataPrevista >= 0 ? converterDataExcel(linha[dataPrevista]) : null,
      projetista: projetista >= 0 ? celulaTexto(linha[projetista]) : "",
      // Cascata: tenta a coluna de status mais recente primeiro; se essa linha não foi
      // tocada na atualização mais nova (célula vazia), cai pra próxima mais antiga.
      statusTexto: colunasStatus.map((idx) => celulaTexto(linha[idx])).find((v) => v) ?? "",
      revisao: revisao >= 0 ? celulaTexto(linha[revisao]) : "",
      dataAlteracao: dataAlteracao >= 0 ? converterDataExcel(linha[dataAlteracao]) : null,
      gedOrigem: ged >= 0 ? celulaTexto(linha[ged]) : "",
    });
  }
  return linhas;
}

export type GrupoContratoSistema = { contrato: string; sistema: string; quantidade: number };

export function resumirPorContratoSistema(linhas: LinhaPortifolio[]): GrupoContratoSistema[] {
  const mapa = new Map<string, GrupoContratoSistema>();
  for (const l of linhas) {
    const chave = `${l.contrato} ${l.sistema}`;
    if (!mapa.has(chave)) mapa.set(chave, { contrato: l.contrato, sistema: l.sistema, quantidade: 0 });
    mapa.get(chave)!.quantidade++;
  }
  return [...mapa.values()].sort((a, b) => b.quantidade - a.quantidade);
}

// Nome "cabeça" de uma Seção conhecida — a parte antes do primeiro parêntese. As Seções do
// catálogo (ver secoesPadrao) costumam agrupar variações num parênteses, ex: "Malha de
// Terra (Memória de Cálculo, Planta Geral, Planta Parcial, Detalhes, Lista de Materiais)" —
// o texto de verdade que vem no Tipo do Excel normalmente é só UMA dessas variações
// ("MALHA DE TERRA - PLANTA PARCIAL"), que nunca vai conter a string toda do catálogo. Bate
// pela cabeça em vez do nome completo, e reaproveita/cria a Seção só com a cabeça (mais
// limpo, e agrupa todas as variações na mesma Seção).
function cabecaDoNome(nome: string): string {
  const antesDoParenteses = nome.split("(")[0]?.trim();
  return antesDoParenteses || nome;
}

// "DIAGRAMA DE INTERLIGAÇÃO" vs "DIAGRAMA INTERLIGAÇÃO" — a mesma planilha usa os dois, com
// e sem a preposição solta. Tira "DE/DA/DO/DAS/DOS" como palavra isolada (não no meio de
// outra palavra) só pra essa segunda tentativa — a primeira (com a preposição) continua
// valendo, essa é só um fallback pra não perder o casamento por causa disso.
function semPreposicoesSoltas(texto: string): string {
  return texto
    .replace(/\b(DE|DA|DO|DAS|DOS)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Nome de prédio/edificação — quando bate mais de uma opção, esses só ganham se NADA mais
// específico bater (ex: "CASA DE CONTROLE – ELÉTRICO..." tem que continuar caindo em
// "Elétrico", não em "Casa de Controle" só porque essa cabeça é mais comprida). Sem essa
// prioridade separada, "mais comprido vence" faria os prédios atropelar as categorias.
const CABECAS_DE_PREDIO = new Set(["CASA DE COMANDO", "CASA DE CONTROLE"]);

// Mesma ideia do import de planilha por obra: procura, dentro do texto do Tipo, o nome de
// alguma Seção JÁ conhecida (em qualquer lugar do workspace, não só na obra de destino —
// obra nova não tem seção nenhuma ainda, então usa o vocabulário do resto do workspace).
export function sugerirNomeSecaoPorTipo(tipo: string, nomesSecoesConhecidas: string[]): string | null {
  const alvo = normalizar(tipo);
  const alvoSemPreposicoes = semPreposicoesSoltas(alvo);
  let melhor: { nome: string; tamanho: number } | null = null;
  let melhorPredio: { nome: string; tamanho: number } | null = null;
  for (const nome of nomesSecoesConhecidas) {
    const cabeca = cabecaDoNome(nome);
    const cabecaNormalizada = normalizar(cabeca);
    if (cabecaNormalizada.length === 0) continue;
    const bate = alvo.includes(cabecaNormalizada) || alvoSemPreposicoes.includes(semPreposicoesSoltas(cabecaNormalizada));
    if (!bate) continue;
    const alvoAtual = CABECAS_DE_PREDIO.has(cabecaNormalizada) ? "predio" : "normal";
    if (alvoAtual === "predio") {
      if (!melhorPredio || cabecaNormalizada.length > melhorPredio.tamanho) melhorPredio = { nome: cabeca, tamanho: cabecaNormalizada.length };
    } else {
      if (!melhor || cabecaNormalizada.length > melhor.tamanho) melhor = { nome: cabeca, tamanho: cabecaNormalizada.length };
    }
  }
  return melhor?.nome ?? melhorPredio?.nome ?? null;
}

// "ROGER", "CEZAR/ROGER" etc — tenta achar UM membro do workspace cujo nome contenha esse
// texto como palavra. Nome composto tipo "MAURO/DANIELA" (duas pessoas): usa sempre o
// primeiro nome como responsável (decisão do usuário — não pergunta qual dos dois).
export function sugerirResponsavelPorNome(projetistaTexto: string, membros: { userId: string; name: string | null }[]): string | null {
  const primeiroNome = projetistaTexto.split("/")[0] ?? "";
  const alvo = normalizar(primeiroNome);
  if (!alvo) return null;
  const candidatos = membros.filter((m) => {
    const nomeNormalizado = normalizar(m.name ?? "");
    return nomeNormalizado
      .split(/\s+/)
      .some((palavra) => palavra === alvo || palavra.startsWith(alvo) || alvo.startsWith(palavra));
  });
  return candidatos.length === 1 ? candidatos[0].userId : null;
}

export async function listarVocabularioSecoes(workspaceId: string): Promise<string[]> {
  const [rows, padrao] = await Promise.all([
    db
      .selectDistinct({ name: secoes.name })
      .from(secoes)
      .innerJoin(obraDisciplinas, eq(obraDisciplinas.id, secoes.obraDisciplinaId))
      .innerJoin(obras, eq(obras.id, obraDisciplinas.obraId))
      .where(eq(obras.workspaceId, workspaceId)),
    // Nomes sugeridos do catálogo (ver secoesPadrao) entram no vocabulário também — ajuda o
    // casamento automático mesmo numa Obra nova que ainda não tem nenhuma Seção de verdade.
    db.selectDistinct({ name: secoesPadrao.name }).from(secoesPadrao).where(eq(secoesPadrao.workspaceId, workspaceId)),
  ]);
  return [...new Set([...rows, ...padrao].map((r) => r.name))];
}

export async function listarMembrosWorkspace(workspaceId: string) {
  return db
    .select({ userId: users.id, name: users.name })
    .from(workspaceMembers)
    .innerJoin(users, eq(users.id, workspaceMembers.userId))
    .where(eq(workspaceMembers.workspaceId, workspaceId));
}

// Só olha o catálogo (Projeto/Obra existem?) — não cria nada ainda, é usado pro resumo da
// Etapa 2 (quais combinações Contrato/Sistema já existem vs vão ser criadas).
export async function verificarProjetosEObrasExistentes(workspaceId: string, grupos: GrupoContratoSistema[]) {
  const projetosExistentes = await db
    .select({ id: projetos.id, name: projetos.name })
    .from(projetos)
    .where(and(eq(projetos.workspaceId, workspaceId), isNull(projetos.deletedAt)));
  const obrasExistentes = await db
    .select({ id: obras.id, name: obras.name, projetoId: obras.projetoId })
    .from(obras)
    .where(and(eq(obras.workspaceId, workspaceId), isNull(obras.deletedAt)));

  return grupos.map((g) => {
    const projeto = projetosExistentes.find((p) => normalizar(p.name) === normalizar(g.contrato));
    const obra = projeto ? obrasExistentes.find((o) => o.projetoId === projeto.id && normalizar(o.name) === normalizar(g.sistema)) : undefined;
    return { ...g, projetoExiste: !!projeto, obraExiste: !!obra };
  });
}

function gerarCodigoCurto(nome: string, existentes: Set<string>): string {
  const base = normalizar(nome).replace(/[^A-Z0-9]/g, "").slice(0, 8) || "COD";
  let candidato = base;
  let n = 1;
  while (existentes.has(candidato)) {
    n += 1;
    candidato = `${base}${n}`;
  }
  existentes.add(candidato);
  return candidato;
}

async function garantirProjeto(workspaceId: string, nome: string): Promise<string> {
  const todos = await db
    .select({ id: projetos.id, name: projetos.name, code: projetos.code })
    .from(projetos)
    .where(and(eq(projetos.workspaceId, workspaceId), isNull(projetos.deletedAt)));
  const match = todos.find((p) => normalizar(p.name) === normalizar(nome));
  if (match) return match.id;
  const code = gerarCodigoCurto(nome, new Set(todos.map((p) => p.code)));
  const criado = await createProjeto(workspaceId, { code, name: nome });
  return criado.id;
}

async function garantirObra(workspaceId: string, projetoId: string, nome: string, userId: string): Promise<string> {
  const todas = await db
    .select({ id: obras.id, name: obras.name, code: obras.code })
    .from(obras)
    .where(and(eq(obras.workspaceId, workspaceId), eq(obras.projetoId, projetoId), isNull(obras.deletedAt)));
  const match = todas.find((o) => normalizar(o.name) === normalizar(nome));
  if (match) return match.id;
  const code = gerarCodigoCurto(nome, new Set(todas.map((o) => o.code)));
  const criada = await createObra(workspaceId, projetoId, { code, name: nome }, userId);
  return criada.id;
}

export type LinhaPortifolioAnalisada = LinhaPortifolio & {
  documentoIdExistente: string | null;
  statusAtual: StatusDocumento | null;
  secaoNomeSugerida: string | null;
  statusSugerido: StatusDocumento | null;
  responsavelIdSugerido: string | null;
};

export async function analisarLinhasPortifolio(workspaceId: string, linhas: LinhaPortifolio[]): Promise<LinhaPortifolioAnalisada[]> {
  const [vocabularioSecoes, membros, documentosExistentes] = await Promise.all([
    listarVocabularioSecoes(workspaceId),
    listarMembrosWorkspace(workspaceId),
    db
      .select({ id: documentos.id, codigoCompleto: documentos.codigoCompleto, status: documentos.status })
      .from(documentos)
      .where(and(eq(documentos.workspaceId, workspaceId), isNull(documentos.deletedAt))),
  ]);
  const existentePorCodigo = new Map(documentosExistentes.map((d) => [d.codigoCompleto.trim().toUpperCase(), d]));

  return linhas.map((l) => {
    const existente = existentePorCodigo.get(l.codigo.trim().toUpperCase()) ?? null;
    return {
      ...l,
      documentoIdExistente: existente?.id ?? null,
      statusAtual: existente?.status ?? null,
      secaoNomeSugerida: sugerirNomeSecaoPorTipo(l.tipo, vocabularioSecoes),
      statusSugerido: sugerirStatusPorTexto(l.statusTexto),
      responsavelIdSugerido: sugerirResponsavelPorNome(l.projetista, membros),
    };
  });
}

export type LinhaPortifolioParaAplicar = {
  contrato: string;
  sistema: string;
  codigo: string;
  tipo: string;
  coordenacao: string;
  dataPrevista: string | null;
  status: StatusDocumento;
  revisao: string;
  dataAlteracao: string | null;
  gedOrigem: string;
  documentoIdExistente: string | null;
  criar: boolean; // só vale quando documentoIdExistente é null
  secaoNome: string | null; // obrigatório quando criar = true
  responsavelId: string | null;
};

export async function aplicarSincronizacaoPortifolio(workspaceId: string, userId: string, linhas: LinhaPortifolioParaAplicar[]) {
  const atualizados: string[] = [];
  const criados: string[] = [];
  const ignorados: { codigo: string; motivo: string }[] = [];

  // Cache pra não bater no banco de novo pra cada linha da mesma obra+disciplina.
  const obraIdPorContratoSistema = new Map<string, string>();
  const disciplinaIdPorObraNome = new Map<string, string>();
  const secaoCache = new Map<string, string>();
  let posicaoSecao = 0;

  // Sem fase na planilha (o time confirmou que não usa a coluna "Projeto" do arquivo) —
  // documento novo entra sempre na primeira Fase cadastrada no workspace.
  const [faseDefault] = await db.select({ id: fases.id }).from(fases).where(eq(fases.workspaceId, workspaceId)).limit(1);

  for (const linha of linhas) {
    try {
      if (linha.documentoIdExistente) {
        // Pra saber se o status realmente mudou (e só nesse caso logar na linha do tempo —
        // usada pela Curva de Avanço; sem isso, resincronizar sem mudança nenhuma criaria
        // evento à toa toda vez).
        const [antes] = await db
          .select({ status: documentos.status })
          .from(documentos)
          .where(eq(documentos.id, linha.documentoIdExistente))
          .limit(1);

        await db
          .update(documentos)
          .set({
            descricao: linha.tipo,
            status: linha.status,
            dataPrevista: linha.dataPrevista,
            statusUpdatedAt: linha.dataAlteracao ? new Date(linha.dataAlteracao) : new Date(),
            revisaoExterna: linha.revisao || null,
            gedOrigem: linha.gedOrigem || null,
            responsavelId: linha.responsavelId,
            updatedAt: new Date(),
          })
          .where(eq(documentos.id, linha.documentoIdExistente));

        if (antes && antes.status !== linha.status) {
          await db.insert(linhaDoTempo).values({
            id: newId("tl"),
            workspaceId,
            documentoId: linha.documentoIdExistente,
            evento: "status_alterado_direto",
            autorId: userId,
            metadata: { statusAnterior: antes.status, statusNovo: linha.status, origem: "sincronizacao_portfolio" },
          });
        }

        atualizados.push(linha.codigo);
        continue;
      }

      if (!linha.criar) {
        ignorados.push({ codigo: linha.codigo, motivo: "Não confirmado pra criar." });
        continue;
      }
      if (!linha.secaoNome) {
        ignorados.push({ codigo: linha.codigo, motivo: "Sem seção definida." });
        continue;
      }
      if (!linha.coordenacao) {
        ignorados.push({ codigo: linha.codigo, motivo: "Sem disciplina (Coordenação) definida." });
        continue;
      }

      const chaveObra = `${linha.contrato} ${linha.sistema}`;
      let obraId = obraIdPorContratoSistema.get(chaveObra);
      if (!obraId) {
        const projetoId = await garantirProjeto(workspaceId, linha.contrato);
        obraId = await garantirObra(workspaceId, projetoId, linha.sistema, userId);
        obraIdPorContratoSistema.set(chaveObra, obraId);
      }

      const chaveDisciplina = `${obraId} ${linha.coordenacao}`;
      let disciplinaId = disciplinaIdPorObraNome.get(chaveDisciplina);
      if (!disciplinaId) {
        disciplinaId = await garantirDisciplina(workspaceId, linha.coordenacao);
        await garantirObraDisciplina(obraId, disciplinaId);
        disciplinaIdPorObraNome.set(chaveDisciplina, disciplinaId);
      }

      // Precisa incluir a obra na chave — sem isso, obras diferentes com a mesma disciplina
      // e nome de seção (comum: "Civil - Formas e Armaduras" se repete em várias obras)
      // acabavam reaproveitando a MESMA seção entre obras (a da primeira obra processada no
      // loop), o que fazia os documentos das obras seguintes apontarem pra seção errada e
      // sumirem da lista da própria obra (bug real encontrado em produção — LOTE 03: 501
      // documentos com secaoId de outra obra).
      const chaveSecao = `${obraId} ${disciplinaId} ${linha.secaoNome}`;
      let secaoId = secaoCache.get(chaveSecao);
      if (!secaoId) {
        const od = await garantirObraDisciplina(obraId, disciplinaId);
        posicaoSecao += 1;
        const secao = await garantirSecaoPorTipo(od.id, linha.secaoNome, posicaoSecao);
        secaoId = secao.id;
        secaoCache.set(chaveSecao, secaoId);
      }

      if (!faseDefault) {
        ignorados.push({ codigo: linha.codigo, motivo: "Workspace sem nenhuma Fase cadastrada." });
        continue;
      }

      await db.insert(documentos).values({
        id: newId("doc"),
        workspaceId,
        obraId,
        disciplinaId,
        secaoId,
        faseId: faseDefault.id,
        tipoDocumentoId: await garantirTipoDocumento(workspaceId, linha.secaoNome),
        sequencial: 0,
        codigoCompleto: linha.codigo,
        descricao: linha.tipo,
        dataPrevista: linha.dataPrevista,
        status: linha.status,
        statusUpdatedAt: linha.dataAlteracao ? new Date(linha.dataAlteracao) : new Date(),
        revisaoExterna: linha.revisao || null,
        gedOrigem: linha.gedOrigem || null,
        responsavelId: linha.responsavelId,
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
