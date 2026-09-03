import { and, eq, gte, inArray, isNotNull, lte, or } from "drizzle-orm";
import { db } from "@/db/client";
import { documentos, grds } from "@/db/schema";
import { listAccessibleObraIdsInWorkspace } from "./permissions";
import { dataEfetivaPrevista } from "@/lib/documentoStatus";

export type CalendarioEvento = {
  id: string;
  tipo: "documento" | "grd";
  data: string;
  codigo: string;
  descricao: string;
  href: string;
  minhaPendencia: boolean;
};

export async function getCalendarioEventos(
  workspaceId: string,
  userId: string,
  params: { inicio: string; fim: string; escopo: "minhas" | "projeto" }
): Promise<CalendarioEvento[]> {
  const obraIds = await listAccessibleObraIdsInWorkspace(userId, workspaceId);
  if (obraIds.length === 0) return [];

  const docsRaw = await db
    .select({
      id: documentos.id,
      codigoCompleto: documentos.codigoCompleto,
      descricao: documentos.descricao,
      dataPrevista: documentos.dataPrevista,
      dataReprogramada: documentos.dataReprogramada,
      responsavelId: documentos.responsavelId,
    })
    .from(documentos)
    .where(
      and(
        eq(documentos.workspaceId, workspaceId),
        inArray(documentos.obraId, obraIds),
        or(isNotNull(documentos.dataPrevista), isNotNull(documentos.dataReprogramada))
      )
    );

  const eventosDocumentos: CalendarioEvento[] = docsRaw
    .map((d) => ({ ...d, ...dataEfetivaPrevista(d) }))
    .filter((d) => d.data !== null && d.data >= params.inicio && d.data <= params.fim)
    .filter((d) => params.escopo !== "minhas" || d.responsavelId === userId)
    .map((d) => ({
      id: d.id,
      tipo: "documento" as const,
      data: d.data!,
      codigo: d.codigoCompleto,
      descricao: d.descricao,
      href: `/workspaces/${workspaceId}/documentos/${d.id}`,
      minhaPendencia: d.responsavelId === userId,
    }));

  let eventosGrd: CalendarioEvento[] = [];
  if (params.escopo === "projeto") {
    const grdsRaw = await db
      .select({ id: grds.id, codigoCompleto: grds.codigoCompleto, dataEmissao: grds.dataEmissao })
      .from(grds)
      .where(
        and(
          eq(grds.workspaceId, workspaceId),
          inArray(grds.obraId, obraIds),
          gte(grds.dataEmissao, params.inicio),
          lte(grds.dataEmissao, params.fim)
        )
      );
    eventosGrd = grdsRaw.map((g) => ({
      id: g.id,
      tipo: "grd" as const,
      data: g.dataEmissao,
      codigo: g.codigoCompleto,
      descricao: g.codigoCompleto,
      href: `/workspaces/${workspaceId}/grds/${g.id}`,
      minhaPendencia: false,
    }));
  }

  return [...eventosDocumentos, ...eventosGrd].sort((a, b) => (a.data < b.data ? -1 : a.data > b.data ? 1 : 0));
}
