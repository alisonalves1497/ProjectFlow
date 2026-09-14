import { and, eq, gte, lte } from "drizzle-orm";
import { db } from "@/db/client";
import { diarioHoras } from "@/db/schema";
import { newId } from "@/lib/id";
import { getMeusDocumentos } from "./painelService";

export type CelulaHora = { data: string; horaInicio: number; projeto: string };

// Grade é estritamente privada — TODA query aqui filtra por userId (o dono), sem exceção
// nem pra administrador. Não existe "ver a grade de outra pessoa" no sistema.
export async function getHorasSemana(
  workspaceId: string,
  userId: string,
  segundaISO: string,
  sextaISO: string
): Promise<CelulaHora[]> {
  const linhas = await db
    .select({ data: diarioHoras.data, horaInicio: diarioHoras.horaInicio, projeto: diarioHoras.projeto })
    .from(diarioHoras)
    .where(
      and(
        eq(diarioHoras.workspaceId, workspaceId),
        eq(diarioHoras.userId, userId),
        gte(diarioHoras.data, segundaISO),
        lte(diarioHoras.data, sextaISO)
      )
    );
  return linhas;
}

// Upsert por (userId, data, horaInicio) — projeto vazio remove a célula (limpar campo).
export async function salvarHoraCelula(
  workspaceId: string,
  userId: string,
  input: { data: string; horaInicio: number; projeto: string }
) {
  const projeto = input.projeto.trim();

  if (!projeto) {
    await db
      .delete(diarioHoras)
      .where(and(eq(diarioHoras.userId, userId), eq(diarioHoras.data, input.data), eq(diarioHoras.horaInicio, input.horaInicio)));
    return;
  }

  await db
    .insert(diarioHoras)
    .values({ id: newId("diahora"), workspaceId, userId, data: input.data, horaInicio: input.horaInicio, projeto })
    .onConflictDoUpdate({
      target: [diarioHoras.userId, diarioHoras.data, diarioHoras.horaInicio],
      set: { projeto, updatedAt: new Date() },
    });
}

export type HorasPorProjeto = { projeto: string; horas: number };

// Total histórico (desde o início) por projeto, só do usuário logado — cada célula
// preenchida vale 1 hora.
export async function getHorasAcumuladasPorProjeto(workspaceId: string, userId: string): Promise<HorasPorProjeto[]> {
  const linhas = await db
    .select({ projeto: diarioHoras.projeto })
    .from(diarioHoras)
    .where(and(eq(diarioHoras.workspaceId, workspaceId), eq(diarioHoras.userId, userId)));

  const totais = new Map<string, number>();
  for (const l of linhas) totais.set(l.projeto, (totais.get(l.projeto) ?? 0) + 1);

  return Array.from(totais, ([projeto, horas]) => ({ projeto, horas })).sort((a, b) => b.horas - a.horas);
}

// Projetos já usados pelo usuário nessa workspace — vira sugestão (datalist) na hora de
// preencher a grade, pra não escrever o mesmo projeto de formas diferentes.
export async function getProjetosUsados(workspaceId: string, userId: string): Promise<string[]> {
  const linhas = await db
    .selectDistinct({ projeto: diarioHoras.projeto })
    .from(diarioHoras)
    .where(and(eq(diarioHoras.workspaceId, workspaceId), eq(diarioHoras.userId, userId)));
  return linhas.map((l) => l.projeto).sort((a, b) => a.localeCompare(b));
}

export type PrazoProximo = {
  documentoId: string;
  descricao: string;
  obraNome: string;
  dataPrevista: string;
};

// Os `limite` prazos mais próximos (pra frente ou já em atraso) entre os documentos
// atribuídos ao usuário — reaproveita getMeusDocumentos (mesma fonte da aba "Meus
// documentos") e ordena pela distância absoluta até hoje, não só cronologicamente, pra
// atraso feio não sumir lá embaixo da lista.
export async function getPrazosProximos(workspaceId: string, userId: string, limite: number): Promise<PrazoProximo[]> {
  const docs = await getMeusDocumentos(workspaceId, userId);
  const hoje = new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00`).getTime();

  return docs
    .filter((d) => d.dataPrevista !== null)
    .map((d) => ({
      documentoId: d.id,
      descricao: d.descricao,
      obraNome: d.obraNome,
      dataPrevista: d.dataPrevista as string,
      distancia: Math.abs(new Date(`${d.dataPrevista}T00:00:00`).getTime() - hoje),
    }))
    .sort((a, b) => a.distancia - b.distancia)
    .slice(0, limite)
    .map(({ documentoId, descricao, obraNome, dataPrevista }) => ({ documentoId, descricao, obraNome, dataPrevista }));
}
