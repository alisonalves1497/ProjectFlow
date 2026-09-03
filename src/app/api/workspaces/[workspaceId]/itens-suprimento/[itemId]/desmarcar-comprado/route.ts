import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { withErrorHandling } from "@/lib/errors";
import { getItemSuprimentoOrThrow, desmarcarComprado } from "@/services/itemSuprimentoService";
import { requireObraAccess } from "@/services/permissions";

type Params = { params: Promise<{ workspaceId: string; itemId: string }> };

export const POST = withErrorHandling(async (_req: Request, { params }: Params) => {
  const user = await requireUser();
  const { workspaceId, itemId } = await params;
  const item = await getItemSuprimentoOrThrow(workspaceId, itemId);
  await requireObraAccess(user.id, workspaceId, item.obraId);
  const updated = await desmarcarComprado(workspaceId, itemId);
  return NextResponse.json({ data: updated });
});
