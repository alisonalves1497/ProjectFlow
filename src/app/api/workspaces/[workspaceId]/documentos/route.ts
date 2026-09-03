import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { withErrorHandling } from "@/lib/errors";
import { documentoCreateSchema, documentoListQuerySchema } from "@/lib/validators";
import { createDocumento, listDocumentos } from "@/services/documentoService";
import { listAccessibleObraIds } from "@/services/obraService";
import { getWorkspaceRole, requireObraAccess } from "@/services/permissions";
import { forbidden } from "@/lib/errors";

type Params = { params: Promise<{ workspaceId: string }> };

export const GET = withErrorHandling(async (req: Request, { params }: Params) => {
  const user = await requireUser();
  const { workspaceId } = await params;
  const role = await getWorkspaceRole(user.id, workspaceId);
  if (!role) throw forbidden("WORKSPACE_ACCESS_DENIED", "Você não é membro deste workspace.");

  const { searchParams } = new URL(req.url);
  const filters = documentoListQuerySchema.parse({
    obraId: searchParams.get("obraId") ?? undefined,
    disciplinaId: searchParams.get("disciplinaId") ?? undefined,
    secaoId: searchParams.get("secaoId") ?? undefined,
    status: searchParams.get("status") ?? undefined,
  });

  const documentos = await listDocumentos(workspaceId, filters);
  if (role === "administrador") {
    return NextResponse.json({ data: documentos });
  }
  const accessibleIds = new Set(await listAccessibleObraIds(user.id));
  return NextResponse.json({ data: documentos.filter((d) => accessibleIds.has(d.obraId)) });
});

export const POST = withErrorHandling(async (req: Request, { params }: Params) => {
  const user = await requireUser();
  const { workspaceId } = await params;
  const input = documentoCreateSchema.parse(await req.json());
  await requireObraAccess(user.id, workspaceId, input.obraId);
  const documento = await createDocumento(workspaceId, user.id, input);
  return NextResponse.json({ data: documento }, { status: 201 });
});
