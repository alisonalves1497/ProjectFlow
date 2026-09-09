import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { documentos, obras, disciplinas, revisoes, users, linhaDoTempo } from "@/db/schema";
import { listAccessibleObraIdsInWorkspace } from "./permissions";
import { isDocumentoFechado, dataEfetivaPrevista } from "@/lib/documentoStatus";
import type { StatusDocumento } from "@/lib/statusGraph";

export type DocumentoDashboard = {
  id: string;
  codigoCompleto: string;
  descricao: string;
  status: StatusDocumento;
  obraId: string;
  obraNome: string;
  disciplinaNome: string;
  responsavelId: string | null;
  responsavelNome: string | null;
  dataPrevista: string | null;
  reprogramado: boolean;
  fechado: boolean;
  emAtraso: boolean;
};

// Todos os documentos ativos das obras que o usuário acessa no workspace — base pros
// dashboards de Gestão (por enquanto só o de Responsável, mas dá pra reaproveitar pra
// outros recortes: por obra, por disciplina, por status).
export async function listDocumentosParaDashboard(workspaceId: string, userId: string): Promise<DocumentoDashboard[]> {
  const obraIds = await listAccessibleObraIdsInWorkspace(userId, workspaceId);
  if (obraIds.length === 0) return [];

  const rows = await db
    .select({
      id: documentos.id,
      codigoCompleto: documentos.codigoCompleto,
      descricao: documentos.descricao,
      status: documentos.status,
      obraId: documentos.obraId,
      obraNome: obras.name,
      disciplinaNome: disciplinas.name,
      responsavelId: documentos.responsavelId,
      responsavelNome: users.name,
      dataPrevista: documentos.dataPrevista,
      dataReprogramada: documentos.dataReprogramada,
      currentRevisionId: documentos.currentRevisionId,
      revisaoEhAsBuilt: revisoes.ehAsBuilt,
      revisaoLetra: revisoes.letra,
      revisaoNumero: revisoes.numero,
    })
    .from(documentos)
    .innerJoin(obras, eq(obras.id, documentos.obraId))
    .innerJoin(disciplinas, eq(disciplinas.id, documentos.disciplinaId))
    .leftJoin(revisoes, eq(revisoes.id, documentos.currentRevisionId))
    .leftJoin(users, eq(users.id, documentos.responsavelId))
    .where(and(inArray(documentos.obraId, obraIds), eq(documentos.workspaceId, workspaceId), isNull(documentos.deletedAt)));

  const hoje = new Date().toISOString().slice(0, 10);

  return rows.map((d) => {
    const fechado = isDocumentoFechado(d);
    const efetiva = dataEfetivaPrevista(d);
    return {
      id: d.id,
      codigoCompleto: d.codigoCompleto,
      descricao: d.descricao,
      status: d.status,
      obraId: d.obraId,
      obraNome: d.obraNome,
      disciplinaNome: d.disciplinaNome,
      responsavelId: d.responsavelId,
      responsavelNome: d.responsavelNome,
      dataPrevista: efetiva.data,
      reprogramado: efetiva.reprogramado,
      fechado,
      emAtraso: !fechado && efetiva.data !== null && efetiva.data < hoje,
    };
  });
}

export type PontoCurvaAvanco = { semana: string; concluidos: number; cancelados: number; emAndamento: number; total: number };

// Classificação simplificada só pra curva — isDocumentoFechado (usado no resto do app)
// depende de dados da revisão atual (letra/número/as-built) que não temos ao "voltar no
// tempo" pra cada evento; aqui olha só o status em si, que é o que fica registrado no evento.
function categoriaDoStatus(status: string): "concluidos" | "cancelados" | "emAndamento" {
  if (status === "liberado_para_construcao") return "concluidos";
  if (status === "cancelado") return "cancelados";
  return "emAndamento";
}

function inicioDaSemana(data: Date): string {
  const d = new Date(Date.UTC(data.getUTCFullYear(), data.getUTCMonth(), data.getUTCDate()));
  const diaSemana = d.getUTCDay(); // 0=domingo
  const deltaPraSegunda = diaSemana === 0 ? -6 : 1 - diaSemana;
  d.setUTCDate(d.getUTCDate() + deltaPraSegunda);
  return d.toISOString().slice(0, 10);
}

// Reconstrói, semana a semana, quantos documentos estavam em cada categoria — a partir de
// hoje (09/09/2026), toda troca de status passa a gerar evento na linha do tempo (ver
// setStatusDireto e aplicarSincronizacaoPortifolio); documentos sem nenhum evento ainda
// (criados antes disso) usam o status ATUAL como aproximação pras semanas passadas, já que
// não tem como saber de verdade qual era o status deles antes de começar a registrar.
export async function getCurvaAvanco(workspaceId: string, userId: string): Promise<PontoCurvaAvanco[]> {
  const obraIds = await listAccessibleObraIdsInWorkspace(userId, workspaceId);
  if (obraIds.length === 0) return [];

  const docsAtuais = await db
    .select({ id: documentos.id, status: documentos.status, createdAt: documentos.createdAt })
    .from(documentos)
    .where(and(inArray(documentos.obraId, obraIds), eq(documentos.workspaceId, workspaceId), isNull(documentos.deletedAt)));
  if (docsAtuais.length === 0) return [];

  const eventos = await db
    .select({ documentoId: linhaDoTempo.documentoId, evento: linhaDoTempo.evento, metadata: linhaDoTempo.metadata, createdAt: linhaDoTempo.createdAt })
    .from(linhaDoTempo)
    .innerJoin(documentos, eq(documentos.id, linhaDoTempo.documentoId))
    .where(
      and(
        inArray(documentos.obraId, obraIds),
        eq(linhaDoTempo.workspaceId, workspaceId),
        inArray(linhaDoTempo.evento, ["status_alterado_direto", "status_transicionado"])
      )
    )
    .orderBy(asc(linhaDoTempo.createdAt));

  const eventosPorDocumento = new Map<string, { createdAt: Date; statusNovo: string }[]>();
  for (const e of eventos) {
    const meta = e.metadata as { statusNovo?: string } | null;
    if (!meta?.statusNovo) continue;
    if (!eventosPorDocumento.has(e.documentoId)) eventosPorDocumento.set(e.documentoId, []);
    eventosPorDocumento.get(e.documentoId)!.push({ createdAt: e.createdAt, statusNovo: meta.statusNovo });
  }

  const hoje = new Date();
  const semanas: string[] = [];
  const primeiraSemana = new Date(Math.min(...docsAtuais.map((d) => d.createdAt.getTime()), hoje.getTime()));
  let cursor = new Date(inicioDaSemana(primeiraSemana) + "T00:00:00Z");
  const fimHoje = new Date(inicioDaSemana(hoje) + "T00:00:00Z");
  while (cursor <= fimHoje) {
    semanas.push(cursor.toISOString().slice(0, 10));
    cursor = new Date(cursor.getTime() + 7 * 86_400_000);
  }
  // Curva só fica interessante depois de algumas semanas registrando — antes disso, mostra
  // só a semana atual (ver getCurvaAvanco jsdoc acima).
  const semanasRelevantes = semanas.slice(-12);

  return semanasRelevantes.map((semana) => {
    const fimDaSemana = new Date(semana + "T23:59:59.999Z");
    const contagem = { concluidos: 0, cancelados: 0, emAndamento: 0 };
    for (const doc of docsAtuais) {
      const eventosDoc = eventosPorDocumento.get(doc.id) ?? [];
      const ultimoAntes = [...eventosDoc].reverse().find((e) => e.createdAt <= fimDaSemana);
      const statusNaSemana = ultimoAntes?.statusNovo ?? doc.status;
      contagem[categoriaDoStatus(statusNaSemana)]++;
    }
    return { semana, ...contagem, total: docsAtuais.length };
  });
}
