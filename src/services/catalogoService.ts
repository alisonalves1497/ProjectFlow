import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { disciplinas, fases, tiposDocumento, obraDisciplinas, secoes, categoriasConhecimento } from "@/db/schema";
import { notFound } from "@/lib/errors";

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
