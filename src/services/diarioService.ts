import { and, desc, eq, ne, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db/client";
import { tarefasPessoais, projetos, documentos, users } from "@/db/schema";
import { badRequest, forbidden } from "@/lib/errors";
import { newId } from "@/lib/id";
import { getMeusDocumentos } from "./painelService";

const criadorPessoal = alias(users, "criador_tarefa_pessoal");
const donoPessoal = alias(users, "dono_tarefa_pessoal");

export type TarefaPessoal = {
  id: string;
  nome: string;
  nomeNegrito: boolean;
  nomeCor: string | null;
  nomeFundo: string | null;
  status: "pendente" | "feito";
  // Texto livre digitado pela pessoa (ex: "Aguardando retorno", "Em campo") — não vincula
  // com documento/projeto, é só controle individual de quem é dono da tarefa.
  statusLivre: string | null;
  statusLivreNegrito: boolean;
  statusLivreCor: string | null;
  statusLivreFundo: string | null;
  dataVencimento: string | null;
  dataInicial: string | null;
  prioridade: "urgente" | "alta" | "normal" | "baixa" | null;
  projetoId: string | null;
  projetoNome: string | null;
  documentoId: string | null;
  documentoCodigo: string | null;
  // Observações livres — mesma ideia do statusLivre, texto qualquer, sem vínculo.
  obs: string | null;
  obsNegrito: boolean;
  obsCor: string | null;
  obsFundo: string | null;
  // Quem criou a tarefa, quando diferente do dono (atribuição) — null se foi o próprio dono
  // que criou, ou se quem criou saiu do workspace depois.
  criadoPorId: string | null;
  criadoPorNome: string | null;
  // Quem é o responsável/dono da tarefa. Nas tarefas normais (listTarefasPessoais) é sempre
  // quem está vendo a lista — donoNome fica null porque a UI já sabe que é "Eu". Já nas
  // tarefas que EU atribuí pra outra pessoa (listTarefasAtribuidasPorMim), donoId é a pessoa
  // que recebeu e donoNome vem preenchido, pra render da coluna "Atribuído".
  donoId: string;
  donoNome: string | null;
  estimativaMinutos: number | null;
  tempoRastreadoMinutos: number | null;
  createdAt: Date;
  concluidaEm: Date | null;
};

// Lista pessoal é estritamente privada — TODA query aqui filtra por userId (o dono), sem
// exceção nem pra administrador. Não existe "ver a lista de outra pessoa" no sistema — o que
// existe é listTarefasAtribuidasPorMim logo abaixo, que devolve só as tarefas que EU atribuí
// (nunca as de terceiros).
export async function listTarefasPessoais(workspaceId: string, userId: string): Promise<TarefaPessoal[]> {
  const linhas = await db
    .select({
      id: tarefasPessoais.id,
      nome: tarefasPessoais.nome,
      nomeNegrito: tarefasPessoais.nomeNegrito,
      nomeCor: tarefasPessoais.nomeCor,
      nomeFundo: tarefasPessoais.nomeFundo,
      status: tarefasPessoais.status,
      statusLivre: tarefasPessoais.statusLivre,
      statusLivreNegrito: tarefasPessoais.statusLivreNegrito,
      statusLivreCor: tarefasPessoais.statusLivreCor,
      statusLivreFundo: tarefasPessoais.statusLivreFundo,
      dataVencimento: tarefasPessoais.dataVencimento,
      dataInicial: tarefasPessoais.dataInicial,
      prioridade: tarefasPessoais.prioridade,
      projetoId: tarefasPessoais.projetoId,
      projetoNome: projetos.name,
      documentoId: tarefasPessoais.documentoId,
      documentoCodigo: documentos.codigoCompleto,
      obs: tarefasPessoais.obs,
      obsNegrito: tarefasPessoais.obsNegrito,
      obsCor: tarefasPessoais.obsCor,
      obsFundo: tarefasPessoais.obsFundo,
      criadoPorId: tarefasPessoais.criadoPorId,
      criadoPorNome: criadorPessoal.name,
      estimativaMinutos: tarefasPessoais.estimativaMinutos,
      tempoRastreadoMinutos: tarefasPessoais.tempoRastreadoMinutos,
      createdAt: tarefasPessoais.createdAt,
      concluidaEm: tarefasPessoais.concluidaEm,
    })
    .from(tarefasPessoais)
    .leftJoin(projetos, eq(projetos.id, tarefasPessoais.projetoId))
    .leftJoin(documentos, eq(documentos.id, tarefasPessoais.documentoId))
    .leftJoin(criadorPessoal, eq(criadorPessoal.id, tarefasPessoais.criadoPorId))
    .where(and(eq(tarefasPessoais.workspaceId, workspaceId), eq(tarefasPessoais.userId, userId)))
    .orderBy(desc(tarefasPessoais.createdAt));

  return linhas.map((l) => ({ ...l, donoId: userId, donoNome: null }));
}

// Tarefas que EU criei mas atribuí pra outra pessoa — é a "volta" da atribuição: confirma que
// funcionou, mostra o status de quem recebeu e deixa editar (é a mesma linha que aparece na
// lista pessoal de quem recebeu — mudar aqui muda lá também, não é uma cópia). Nunca inclui
// tarefa de terceiros: só o que eu mesmo atribuí.
export async function listTarefasAtribuidasPorMim(workspaceId: string, criadorId: string): Promise<TarefaPessoal[]> {
  const linhas = await db
    .select({
      id: tarefasPessoais.id,
      nome: tarefasPessoais.nome,
      nomeNegrito: tarefasPessoais.nomeNegrito,
      nomeCor: tarefasPessoais.nomeCor,
      nomeFundo: tarefasPessoais.nomeFundo,
      status: tarefasPessoais.status,
      statusLivre: tarefasPessoais.statusLivre,
      statusLivreNegrito: tarefasPessoais.statusLivreNegrito,
      statusLivreCor: tarefasPessoais.statusLivreCor,
      statusLivreFundo: tarefasPessoais.statusLivreFundo,
      dataVencimento: tarefasPessoais.dataVencimento,
      dataInicial: tarefasPessoais.dataInicial,
      prioridade: tarefasPessoais.prioridade,
      projetoId: tarefasPessoais.projetoId,
      projetoNome: projetos.name,
      documentoId: tarefasPessoais.documentoId,
      documentoCodigo: documentos.codigoCompleto,
      obs: tarefasPessoais.obs,
      obsNegrito: tarefasPessoais.obsNegrito,
      obsCor: tarefasPessoais.obsCor,
      obsFundo: tarefasPessoais.obsFundo,
      criadoPorId: tarefasPessoais.criadoPorId,
      donoId: tarefasPessoais.userId,
      donoNome: donoPessoal.name,
      estimativaMinutos: tarefasPessoais.estimativaMinutos,
      tempoRastreadoMinutos: tarefasPessoais.tempoRastreadoMinutos,
      createdAt: tarefasPessoais.createdAt,
      concluidaEm: tarefasPessoais.concluidaEm,
    })
    .from(tarefasPessoais)
    .leftJoin(projetos, eq(projetos.id, tarefasPessoais.projetoId))
    .leftJoin(documentos, eq(documentos.id, tarefasPessoais.documentoId))
    .innerJoin(donoPessoal, eq(donoPessoal.id, tarefasPessoais.userId))
    .where(and(eq(tarefasPessoais.workspaceId, workspaceId), eq(tarefasPessoais.criadoPorId, criadorId), ne(tarefasPessoais.userId, criadorId)))
    .orderBy(desc(tarefasPessoais.createdAt));

  return linhas.map((l) => ({ ...l, criadoPorNome: null }));
}

// `responsavelId` permite criar a tarefa já na lista de outra pessoa (atribuição) — criadoPorId
// fica registrado pra mostrar "atribuído por" pra quem recebeu. Sem isso, dono = criador.
export async function createTarefaPessoal(workspaceId: string, criadorId: string, nome: string, responsavelId?: string) {
  const texto = nome.trim();
  if (!texto) throw badRequest("TAREFA_NOME_VAZIO", "Dê um nome pra tarefa antes de salvar.");

  const [tarefa] = await db
    .insert(tarefasPessoais)
    .values({ id: newId("tarefa"), workspaceId, userId: responsavelId ?? criadorId, criadoPorId: criadorId, nome: texto })
    .returning();
  return tarefa;
}

export type PatchTarefaPessoal = {
  // Reatribui a tarefa pra outra pessoa (ou de volta pra si) — vira a coluna `userId` no
  // banco. Quem pode fazer isso é o mesmo WHERE de sempre: dono atual ou quem criou.
  donoId?: string;
  nome?: string;
  nomeNegrito?: boolean;
  nomeCor?: string | null;
  nomeFundo?: string | null;
  status?: "pendente" | "feito";
  statusLivre?: string | null;
  statusLivreNegrito?: boolean;
  statusLivreCor?: string | null;
  statusLivreFundo?: string | null;
  obs?: string | null;
  obsNegrito?: boolean;
  obsCor?: string | null;
  obsFundo?: string | null;
  dataVencimento?: string | null;
  dataInicial?: string | null;
  // Data (não hora) de conclusão — definir uma data marca a tarefa como feita; limpar
  // devolve pra pendente. Fica em sincronia com `status` (ver updateTarefaPessoal).
  concluidaEm?: string | null;
  prioridade?: "urgente" | "alta" | "normal" | "baixa" | null;
  projetoId?: string | null;
  documentoId?: string | null;
  estimativaMinutos?: number | null;
  tempoRastreadoMinutos?: number | null;
};

// O WHERE aceita o dono OU quem criou/atribuiu a tarefa — garante que ninguém edita tarefa
// alheia mesmo forjando o id no formulário, mas deixa quem atribuiu corrigir/acompanhar o que
// atribuiu (mesma linha que o dono vê, não uma cópia).
export async function updateTarefaPessoal(workspaceId: string, userId: string, tarefaId: string, patch: PatchTarefaPessoal) {
  const set: Partial<typeof tarefasPessoais.$inferInsert> = { updatedAt: new Date() };

  if (patch.donoId !== undefined) set.userId = patch.donoId;
  if (patch.nome !== undefined) {
    const nome = patch.nome.trim();
    if (!nome) throw badRequest("TAREFA_NOME_VAZIO", "Dê um nome pra tarefa antes de salvar.");
    set.nome = nome;
  }
  if (patch.nomeNegrito !== undefined) set.nomeNegrito = patch.nomeNegrito;
  if (patch.nomeCor !== undefined) set.nomeCor = patch.nomeCor;
  if (patch.nomeFundo !== undefined) set.nomeFundo = patch.nomeFundo;
  if (patch.status !== undefined) {
    set.status = patch.status;
    set.concluidaEm = patch.status === "feito" ? new Date() : null;
  }
  if (patch.concluidaEm !== undefined) {
    set.concluidaEm = patch.concluidaEm ? new Date(`${patch.concluidaEm}T12:00:00`) : null;
    set.status = patch.concluidaEm ? "feito" : "pendente";
  }
  if (patch.statusLivre !== undefined) set.statusLivre = patch.statusLivre?.trim() || null;
  if (patch.statusLivreNegrito !== undefined) set.statusLivreNegrito = patch.statusLivreNegrito;
  if (patch.statusLivreCor !== undefined) set.statusLivreCor = patch.statusLivreCor;
  if (patch.statusLivreFundo !== undefined) set.statusLivreFundo = patch.statusLivreFundo;
  if (patch.obs !== undefined) set.obs = patch.obs?.trim() || null;
  if (patch.obsNegrito !== undefined) set.obsNegrito = patch.obsNegrito;
  if (patch.obsCor !== undefined) set.obsCor = patch.obsCor;
  if (patch.obsFundo !== undefined) set.obsFundo = patch.obsFundo;
  if (patch.dataVencimento !== undefined) set.dataVencimento = patch.dataVencimento;
  if (patch.dataInicial !== undefined) set.dataInicial = patch.dataInicial;
  if (patch.prioridade !== undefined) set.prioridade = patch.prioridade;
  if (patch.projetoId !== undefined) set.projetoId = patch.projetoId;
  if (patch.documentoId !== undefined) set.documentoId = patch.documentoId;
  if (patch.estimativaMinutos !== undefined) set.estimativaMinutos = patch.estimativaMinutos;
  if (patch.tempoRastreadoMinutos !== undefined) set.tempoRastreadoMinutos = patch.tempoRastreadoMinutos;

  const [tarefa] = await db
    .update(tarefasPessoais)
    .set(set)
    .where(
      and(
        eq(tarefasPessoais.id, tarefaId),
        eq(tarefasPessoais.workspaceId, workspaceId),
        or(eq(tarefasPessoais.userId, userId), eq(tarefasPessoais.criadoPorId, userId))
      )
    )
    .returning();
  if (!tarefa) throw forbidden("TAREFA_EDIT_DENIED", "Você só pode editar tarefas suas ou que você atribuiu.");
  return tarefa;
}

export async function deleteTarefaPessoal(workspaceId: string, userId: string, tarefaId: string) {
  const res = await db
    .delete(tarefasPessoais)
    .where(
      and(
        eq(tarefasPessoais.id, tarefaId),
        eq(tarefasPessoais.workspaceId, workspaceId),
        or(eq(tarefasPessoais.userId, userId), eq(tarefasPessoais.criadoPorId, userId))
      )
    )
    .returning({ id: tarefasPessoais.id });
  if (res.length === 0) throw forbidden("TAREFA_DELETE_DENIED", "Você só pode excluir tarefas suas ou que você atribuiu.");
}

export type HorasPorProjeto = { projeto: string; horas: number };

// Soma tempoRastreadoMinutos das tarefas pessoais vinculadas a um Projeto — só do usuário
// logado, desde sempre (histórico completo, não só da semana).
export async function getHorasAcumuladasPorProjeto(workspaceId: string, userId: string): Promise<HorasPorProjeto[]> {
  const linhas = await db
    .select({ projeto: projetos.name, minutos: sql<number>`sum(${tarefasPessoais.tempoRastreadoMinutos})` })
    .from(tarefasPessoais)
    .innerJoin(projetos, eq(projetos.id, tarefasPessoais.projetoId))
    .where(
      and(
        eq(tarefasPessoais.workspaceId, workspaceId),
        eq(tarefasPessoais.userId, userId),
        sql`${tarefasPessoais.tempoRastreadoMinutos} is not null`
      )
    )
    .groupBy(projetos.name);

  return linhas.map((l) => ({ projeto: l.projeto, horas: Math.round((Number(l.minutos) / 60) * 10) / 10 })).sort((a, b) => b.horas - a.horas);
}

export type ItemTrabalho = {
  id: string;
  tipo: "documento" | "tarefa";
  titulo: string;
  subtitulo: string | null;
  dataVencimento: string | null;
  href: string | null;
  prioridade: "urgente" | "alta" | "normal" | "baixa" | null;
};

export type MeuTrabalho = {
  pendente: { hoje: ItemTrabalho[]; emAtraso: ItemTrabalho[]; proximo: ItemTrabalho[]; naoProgramado: ItemTrabalho[] };
  feito: ItemTrabalho[];
};

function porOrdemDeData(a: ItemTrabalho, b: ItemTrabalho): number {
  if (a.dataVencimento === b.dataVencimento) return a.titulo.localeCompare(b.titulo);
  if (a.dataVencimento === null) return 1;
  if (b.dataVencimento === null) return -1;
  return a.dataVencimento.localeCompare(b.dataVencimento);
}

// Une documentos atribuídos ao usuário (que já têm prazo no sistema) com as tarefas da Lista
// Pessoal (avulsas, criadas por ele) numa única visão, no espírito de "Minhas tarefas" do
// ClickUp: aba Pendente agrupada por Hoje/Em atraso/Próximo/Não programado, aba Feito solta.
export async function getMeuTrabalho(workspaceId: string, userId: string): Promise<MeuTrabalho> {
  const [docs, tarefas] = await Promise.all([getMeusDocumentos(workspaceId, userId), listTarefasPessoais(workspaceId, userId)]);

  const itensDocumentos: ItemTrabalho[] = docs.map((d) => ({
    id: d.id,
    tipo: "documento",
    titulo: `${d.codigoCompleto} — ${d.descricao}`,
    subtitulo: d.obraNome,
    dataVencimento: d.dataPrevista,
    href: `/workspaces/${workspaceId}/documentos/${d.id}`,
    prioridade: null,
  }));
  const feitoDocumentos = new Set(docs.filter((d) => d.fechado).map((d) => d.id));

  const itensTarefas: ItemTrabalho[] = tarefas.map((t) => ({
    id: t.id,
    tipo: "tarefa",
    titulo: t.nome,
    subtitulo: t.projetoNome ?? "Lista pessoal",
    dataVencimento: t.dataVencimento,
    href: null,
    prioridade: t.prioridade,
  }));
  const feitoTarefas = new Set(tarefas.filter((t) => t.status === "feito").map((t) => t.id));

  const todosItens = [...itensDocumentos, ...itensTarefas];
  const ehFeito = (item: ItemTrabalho) => (item.tipo === "documento" ? feitoDocumentos.has(item.id) : feitoTarefas.has(item.id));

  const hojeISO = new Date().toISOString().slice(0, 10);
  const pendente = { hoje: [] as ItemTrabalho[], emAtraso: [] as ItemTrabalho[], proximo: [] as ItemTrabalho[], naoProgramado: [] as ItemTrabalho[] };
  const feito: ItemTrabalho[] = [];

  for (const item of todosItens) {
    if (ehFeito(item)) {
      feito.push(item);
      continue;
    }
    if (item.dataVencimento === null) pendente.naoProgramado.push(item);
    else if (item.dataVencimento === hojeISO) pendente.hoje.push(item);
    else if (item.dataVencimento < hojeISO) pendente.emAtraso.push(item);
    else pendente.proximo.push(item);
  }

  pendente.hoje.sort(porOrdemDeData);
  pendente.emAtraso.sort(porOrdemDeData);
  pendente.proximo.sort(porOrdemDeData);
  pendente.naoProgramado.sort((a, b) => a.titulo.localeCompare(b.titulo));
  feito.sort((a, b) => b.dataVencimento?.localeCompare(a.dataVencimento ?? "") ?? 0);

  return { pendente, feito };
}
