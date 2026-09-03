import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { withErrorHandling } from "@/lib/errors";
import { detachDocumento, getItemSuprimentoOrThrow } from "@/services/itemSuprimentoService";
import { requireObraAccess } from "@/services/permissions";

type Params = { params: Promise<{ workspaceId: string; itemId: string; documentoId: string }> };

export const DELETE = withErrorHandling(async (_req: Request, { params }: Params) => {
  const user = await requireUser();
  const { workspaceId, itemId, documentoId } = await params;
  const item = await getItemSuprimentoOrThrow(workspaceId, itemId);
  await requireObraAccess(user.id, workspaceId, item.obraId);
  await detachDocumento(workspaceId, itemId, documentoId);
  return new NextResponse(null, { status: 204 });
});
