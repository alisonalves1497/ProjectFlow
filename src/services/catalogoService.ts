import { and, count, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { disciplinas, fases, tiposDocumento, obraDisciplinas, secoes, secoesPadrao, categoriasConhecimento } from "@/db/schema";
import { notFound } from "@/lib/errors";
import { newId } from "@/lib/id";

export async function listFases(workspaceId: string) {
  return db.select().from(fases).where(eq(fases.workspaceId, workspaceId));
}

export async function listCategoriasConhecimento(workspaceId: string) {
  return db.select().from(categoriasConhecimento).where(eq(categoriasConhecimento.workspaceId, workspaceId));
}

export async function listTiposDocumento(workspaceId: string) {
  return db.select().from(tiposDocumento).where(eq(tiposDocumento.workspaceId, workspaceId));
}

export async function listDisciplinas(workspaceId: string) {
  return db.select().from(disciplinas).where(eq(disciplinas.workspaceId, workspaceId));
}

// Nomes de Seção sugeridos pra uma Disciplina (não são Seções de verdade — ver comentário no
// schema). Usado pro menu do form de "Novo documento" e como vocabulário extra nos imports.
export async function listSecoesPadrao(workspaceId: string, disciplinaId: string) {
  return db
    .select({ id: secoesPadrao.id, name: secoesPadrao.name, ordem: secoesPadrao.ordem })
    .from(secoesPadrao)
    .where(and(eq(secoesPadrao.workspaceId, workspaceId), eq(secoesPadrao.disciplinaId, disciplinaId)))
    .orderBy(secoesPadrao.ordem);
}

// Usado só pra calcular a próxima posição na hora de materializar uma Seção sugerida do
// catálogo em Seção de verdade (ver createDocumentoAction).
export async function contarSecoesDaObraDisciplina(obraDisciplinaId: string): Promise<number> {
  const [{ total }] = await db.select({ total: count() }).from(secoes).where(eq(secoes.obraDisciplinaId, obraDisciplinaId));
  return total;
}

export async function getSecaoPadraoOrThrow(workspaceId: string, id: string) {
  const [row] = await db
    .select({ id: secoesPadrao.id, disciplinaId: secoesPadrao.disciplinaId, name: secoesPadrao.name })
    .from(secoesPadrao)
    .where(and(eq(secoesPadrao.id, id), eq(secoesPadrao.workspaceId, workspaceId)))
    .limit(1);
  if (!row) throw notFound("SECAO_PADRAO_NOT_FOUND", "Nome de seção sugerida não encontrado.");
  return row;
}

export async function listSecoesPadraoDoWorkspace(workspaceId: string) {
  return db
    .select({ id: secoesPadrao.id, disciplinaId: secoesPadrao.disciplinaId, name: secoesPadrao.name, ordem: secoesPadrao.ordem })
    .from(secoesPadrao)
    .where(eq(secoesPadrao.workspaceId, workspaceId))
    .orderBy(secoesPadrao.ordem);
}

// Cria uma leva de nomes padrão pra uma Disciplina de uma vez, na ordem dada (reaproveita se
// já existir um com o mesmo nome — idempotente, pode rodar de novo sem duplicar).
export async function adicionarSecoesPadrao(workspaceId: string, disciplinaId: string, nomes: string[]) {
  const existentes = await db
    .select({ name: secoesPadrao.name, ordem: secoesPadrao.ordem })
    .from(secoesPadrao)
    .where(and(eq(secoesPadrao.workspaceId, workspaceId), eq(secoesPadrao.disciplinaId, disciplinaId)));
  const nomesExistentes = new Set(existentes.map((e) => e.name));
  let proximaOrdem = existentes.reduce((max, e) => Math.max(max, e.ordem), 0) + 1;

  const novos = nomes.filter((n) => !nomesExistentes.has(n));
  if (novos.length === 0) return [];

  const values = novos.map((name) => ({ id: newId("secp"), workspaceId, disciplinaId, name, ordem: proximaOrdem++ }));
  return db.insert(secoesPadrao).values(values).returning();
}

// Disciplinas ativas nesta obra, cada uma com suas Seções — usado pro <select> em cascata
// do formulário de criação de Documento (escolhe Disciplina, depois Seção).
export async function listDisciplinasComSecoesPorObra(obraId: string) {
  const rows = await db
    .select({
      obraDisciplinaId: obraDisciplinas.id,
      disciplinaId: disciplinas.id,
      disciplinaCode: disciplinas.code,
      disciplinaName: disciplinas.name,
      secaoId: secoes.id,
      secaoName: secoes.name,
    })
    .from(obraDisciplinas)
    .innerJoin(disciplinas, eq(disciplinas.id, obraDisciplinas.disciplinaId))
    .leftJoin(secoes, eq(secoes.obraDisciplinaId, obraDisciplinas.id))
    .where(eq(obraDisciplinas.obraId, obraId));

  const map = new Map<
    string,
    { disciplinaId: string; code: string; name: string; secoes: { id: string; name: string }[] }
  >();
  for (const r of rows) {
    if (!map.has(r.disciplinaId)) {
      map.set(r.disciplinaId, { disciplinaId: r.disciplinaId, code: r.disciplinaCode, name: r.disciplinaName, secoes: [] });
    }
    if (r.secaoId) {
      map.get(r.disciplinaId)!.secoes.push({ id: r.secaoId, name: r.secaoName! });
    }
  }
  return Array.from(map.values());
}

// Renomeia uma Seção — o título ("Civil - Sondagem") é Disciplina + Seção, mas só o nome
// da Seção é armazenado editável aqui (a Disciplina é fixa pela ligação obra_disciplinas).
// `obraId` escopa a checagem pra não deixar editar seção de outra obra via id adivinhado.
export async function renomearSecao(obraId: string, secaoId: string, name: string) {
  const [secao] = await db
    .select({ id: secoes.id })
    .from(secoes)
    .innerJoin(obraDisciplinas, eq(obraDisciplinas.id, secoes.obraDisciplinaId))
    .where(and(eq(secoes.id, secaoId), eq(obraDisciplinas.obraId, obraId)))
    .limit(1);
  if (!secao) throw notFound("SECAO_NOT_FOUND", "Seção não encontrada nesta obra.");

  const [updated] = await db.update(secoes).set({ name, updatedAt: new Date() }).where(eq(secoes.id, secaoId)).returning();
  return updated;
}
