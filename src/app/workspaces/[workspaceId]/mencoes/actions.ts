"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { marcarMencaoLida } from "@/services/documentoChatService";

export async function dispensarMencaoAction(workspaceId: string, mencaoId: string): Promise<{ ok: boolean }> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false };
  await marcarMencaoLida(workspaceId, session.user.id, mencaoId);
  revalidatePath(`/workspaces/${workspaceId}`);
  return { ok: true };
}
