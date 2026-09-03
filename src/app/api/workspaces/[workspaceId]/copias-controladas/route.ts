import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { withErrorHandling } from "@/lib/errors";
import { copiaControladaCreateSchema, copiaControladaListQuerySchema } from "@/lib/validators";
import { createCopiaControlada, listCopiasControladas } from "@/services/copiaControladaService";
import { getDocumentoOrThrow } from "@/services/documentoService";
import { requireObraAccess } from "@/services/permissions";

type Params = { params: Promise<{ workspaceId: string }> };

export const GET = withErrorHandling(async (req: Request, { params }: Params) => {
  const user = await requireUser();
  const { workspaceId } = await params;

  const { searchParams } = new URL(req.url);
  const filters = copiaControladaListQuerySchema.parse({
    obraId: searchParams.get("obraId") ?? undefined,
    documentoId: searchParams.get("documentoId") ?? undefined,
  });
  if (!filters.obraId) {
    return NextResponse.json({ error: { code: "OBRA_ID_REQUIRED", message: "obraId é obrigatório." } }, { status: 400 });
  }
  await requireObraAccess(user.id, workspaceId, filters.obraId);

  const copias = await listCopiasControladas(workspaceId, filters);
  return NextResponse.json({ data: copias });
});

export const POST = withErrorHandling(async (req: Request, { params }: Params) => {
  const user = await requireUser();
  const { workspaceId } = await params;
  const input = copiaControladaCreateSchema.parse(await req.json());

  const documento = await getDocumentoOrThrow(workspaceId, input.documentoId);
  await requireObraAccess(user.id, workspaceId, documento.obraId);

  const copia = await createCopiaControlada(workspaceId, user.id, input);
  return NextResponse.json({ data: copia }, { status: 201 });
});
