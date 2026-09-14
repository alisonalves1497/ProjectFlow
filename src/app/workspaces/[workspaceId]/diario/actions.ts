"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { salvarHoraCelula } from "@/services/diarioService";

export async function salvarHoraCelulaAction(
  workspaceId: string,
  input: { data: string; horaInicio: number; projeto: string }
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Não autenticado." };

  await salvarHoraCelula(workspaceId, session.user.id, input);
  revalidatePath(`/workspaces/${workspaceId}/diario`);
  return { ok: true };
}
