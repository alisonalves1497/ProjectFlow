import { and, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { documentos, obras, disciplinas, revisoes, users } from "@/db/schema";
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
