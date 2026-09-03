import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { withErrorHandling } from "@/lib/errors";
import { getGrdOrThrow, listGrdDestinatarios, listGrdDocumentos } from "@/services/grdService";
import { requireObraAccess } from "@/services/permissions";

type Params = { params: Promise<{ workspaceId: string; grdId: string }> };

export const GET = withErrorHandling(async (_req: Request, { params }: Params) => {
  const user = await requireUser();
  const { workspaceId, grdId } = await params;
  const grd = await getGrdOrThrow(workspaceId, grdId);
  await requireObraAccess(user.id, workspaceId, grd.obraId);

  const [documentos, destinatarios] = await Promise.all([listGrdDocumentos(grdId), listGrdDestinatarios(grdId)]);
  return NextResponse.json({ data: { ...grd, documentos, destinatarios } });
});
