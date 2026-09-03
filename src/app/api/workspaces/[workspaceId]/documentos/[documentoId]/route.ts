import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { withErrorHandling } from "@/lib/errors";
import { documentoUpdateSchema } from "@/lib/validators";
import { getDocumentoOrThrow, softDeleteDocumento, updateDocumento } from "@/services/documentoService";
import { requireObraAccess, requireWorkspaceRole } from "@/services/permissions";

type Params = { params: Promise<{ workspaceId: string; documentoId: string }> };

export const GET = withErrorHandling(async (_req: Request, { params }: Params) => {
  const user = await requireUser();
  const { workspaceId, documentoId } = await params;
  const documento = await getDocumentoOrThrow(workspaceId, documentoId);
  await requireObraAccess(user.id, workspaceId, documento.obraId);
  return NextResponse.json({ data: documento });
});

export const PATCH = withErrorHandling(async (req: Request, { params }: Params) => {
  const user = await requireUser();
  const { workspaceId, documentoId } = await params;
  const documento = await getDocumentoOrThrow(workspaceId, documentoId);
  await requireObraAccess(user.id, workspaceId, documento.obraId);
  const input = documentoUpdateSchema.parse(await req.json());
  const updated = await updateDocumento(workspaceId, documentoId, input);
  return NextResponse.json({ data: updated });
});

export const DELETE = withErrorHandling(async (_req: Request, { params }: Params) => {
  const user = await requireUser();
  const { workspaceId, documentoId } = await params;
  const documento = await getDocumentoOrThrow(workspaceId, documentoId);
  // soft delete é mais destrutivo que editar campos — exige administrador/coordenador do workspace, não só acesso à obra.
  await requireWorkspaceRole(user.id, workspaceId, ["administrador", "coordenador"]);
  await softDeleteDocumento(workspaceId, documento.id);
  return new NextResponse(null, { status: 204 });
});
