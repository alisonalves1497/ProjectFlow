import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { dashboardVisoes } from "@/db/schema";
import { newId } from "@/lib/id";
import { badRequest, notFound } from "@/lib/errors";
import { normalizarLayout, type DashboardVisao, type DashboardVisaoConfig } from "@/lib/dashboardFiltros";

function sanearConfig(config: DashboardVisaoConfig): DashboardVisaoConfig {
  const filtros: Record<string, string> = {};
  for (const [k, v] of Object.entries(config?.filtros ?? {})) {
    if (typeof v === "string" && v) filtros[k] = v;
  }
  return { layout: normalizarLayout(config?.layout), filtros };
}

export async function listVisoesDashboard(workspaceId: string, userId: string): Promise<DashboardVisao[]> {
  const rows = await db
    .select({ id: dashboardVisoes.id, nome: dashboardVisoes.nome, config: dashboardVisoes.config })
    .from(dashboardVisoes)
    .where(and(eq(dashboardVisoes.workspaceId, workspaceId), eq(dashboardVisoes.userId, userId)))
    .orderBy(asc(dashboardVisoes.nome));
  return rows.map((r) => ({ id: r.id, nome: r.nome, config: sanearConfig(r.config as DashboardVisaoConfig) }));
}

export async function criarVisaoDashboard(
  workspaceId: string,
  userId: string,
  nome: string,
  config: DashboardVisaoConfig
): Promise<DashboardVisao> {
  const nomeTrim = nome.trim();
  if (!nomeTrim) throw badRequest("VISAO_SEM_NOME", "Dê um nome pra visão.");
  if (nomeTrim.length > 60) throw badRequest("VISAO_NOME_LONGO", "Nome muito longo (máx. 60).");

  const saneada = sanearConfig(config);
  // Upsert por nome: salvar de novo com o mesmo nome sobrescreve.
  const [existente] = await db
    .select({ id: dashboardVisoes.id })
    .from(dashboardVisoes)
    .where(and(eq(dashboardVisoes.workspaceId, workspaceId), eq(dashboardVisoes.userId, userId), eq(dashboardVisoes.nome, nomeTrim)))
    .limit(1);

  if (existente) {
    await db
      .update(dashboardVisoes)
      .set({ config: saneada, updatedAt: new Date() })
      .where(eq(dashboardVisoes.id, existente.id));
    return { id: existente.id, nome: nomeTrim, config: saneada };
  }

  const id = newId("dashv");
  await db.insert(dashboardVisoes).values({ id, workspaceId, userId, nome: nomeTrim, config: saneada });
  return { id, nome: nomeTrim, config: saneada };
}

export async function excluirVisaoDashboard(workspaceId: string, userId: string, visaoId: string): Promise<void> {
  const res = await db
    .delete(dashboardVisoes)
    .where(and(eq(dashboardVisoes.id, visaoId), eq(dashboardVisoes.workspaceId, workspaceId), eq(dashboardVisoes.userId, userId)))
    .returning({ id: dashboardVisoes.id });
  if (res.length === 0) throw notFound("VISAO_NOT_FOUND", "Visão não encontrada.");
}
