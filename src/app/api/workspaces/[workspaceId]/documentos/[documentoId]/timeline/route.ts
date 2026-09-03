import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { withErrorHandling } from "@/lib/errors";
import { getDocumentoOrThrow } from "@/services/documentoService";
import { listTimeline } from "@/services/timelineService";
import { requireObraAccess } from "@/services/permissions";

type Params = { params: Promise<{ workspaceId: string; documentoId: string }> };

export const GET = withErrorHandling(async (_req: Request, { params }: Params) => {
  const user = await requireUser();
  const { workspaceId, documentoId } = await params;
  const documento = await getDocumentoOrThrow(workspaceId, documentoId);
  await requireObraAccess(user.id, workspaceId, documento.obraId);
  const eventos = await listTimeline(workspaceId, documentoId);
  return NextResponse.json({ data: eventos });
});
