import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { withErrorHandling } from "@/lib/errors";
import { comentarioCreateSchema } from "@/lib/validators";
import { getDocumentoOrThrow } from "@/services/documentoService";
import { createComentario, listComentarios } from "@/services/comentarioService";
import { requireObraAccess } from "@/services/permissions";

type Params = { params: Promise<{ workspaceId: string; documentoId: string; revisaoId: string }> };

export const GET = withErrorHandling(async (_req: Request, { params }: Params) => {
  const user = await requireUser();
  const { workspaceId, documentoId, revisaoId } = await params;
  const documento = await getDocumentoOrThrow(workspaceId, documentoId);
  await requireObraAccess(user.id, workspaceId, documento.obraId);
  const comentarios = await listComentarios(workspaceId, revisaoId);
  return NextResponse.json({ data: comentarios });
});

export const POST = withErrorHandling(async (req: Request, { params }: Params) => {
  const user = await requireUser();
  const { workspaceId, documentoId, revisaoId } = await params;
  const documento = await getDocumentoOrThrow(workspaceId, documentoId);
  await requireObraAccess(user.id, workspaceId, documento.obraId);
  const input = comentarioCreateSchema.parse(await req.json());
  const comentario = await createComentario(workspaceId, documentoId, revisaoId, user.id, input);
  return NextResponse.json({ data: comentario }, { status: 201 });
});
