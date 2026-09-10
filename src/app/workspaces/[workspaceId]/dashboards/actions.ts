"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { ApiError, forbidden, unauthenticated } from "@/lib/errors";
import { getWorkspaceRole } from "@/services/permissions";
import { criarVisaoDashboard, excluirVisaoDashboard } from "@/services/dashboardVisaoService";
import type { DashboardVisao, DashboardVisaoConfig } from "@/lib/dashboardFiltros";

type Resultado<T> = { ok: true; data: T } | { ok: false; error: string };

async function exigirAcesso(workspaceId: string): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw unauthenticated();
  const role = await getWorkspaceRole(session.user.id, workspaceId);
  if (!role) throw forbidden("SEM_ACESSO", "Sem acesso a este workspace.");
  return session.user.id;
}

export async function salvarVisaoDashboardAction(
  workspaceId: string,
  nome: string,
  config: DashboardVisaoConfig
): Promise<Resultado<DashboardVisao>> {
  try {
    const userId = await exigirAcesso(workspaceId);
    const visao = await criarVisaoDashboard(workspaceId, userId, nome, config);
    revalidatePath(`/workspaces/${workspaceId}/dashboards`);
    return { ok: true, data: visao };
  } catch (err) {
    if (err instanceof ApiError) return { ok: false, error: err.message };
    throw err;
  }
}

export async function excluirVisaoDashboardAction(workspaceId: string, visaoId: string): Promise<Resultado<null>> {
  try {
    const userId = await exigirAcesso(workspaceId);
    await excluirVisaoDashboard(workspaceId, userId, visaoId);
    revalidatePath(`/workspaces/${workspaceId}/dashboards`);
    return { ok: true, data: null };
  } catch (err) {
    if (err instanceof ApiError) return { ok: false, error: err.message };
    throw err;
  }
}
