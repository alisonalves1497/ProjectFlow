import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { withErrorHandling } from "@/lib/errors";
import { grdCreateSchema, grdListQuerySchema } from "@/lib/validators";
import { createGrd, listGrds } from "@/services/grdService";
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
  const filters = grdListQuerySchema.parse({
    obraId: searchParams.get("obraId") ?? undefined,
    status: searchParams.get("status") ?? undefined,
  });

  const grds = await listGrds(workspaceId, filters);
  if (role === "administrador") {
    return NextResponse.json({ data: grds });
  }
  const accessibleIds = new Set(await listAccessibleObraIds(user.id));
  return NextResponse.json({ data: grds.filter((g) => accessibleIds.has(g.obraId)) });
});

export const POST = withErrorHandling(async (req: Request, { params }: Params) => {
  const user = await requireUser();
  const { workspaceId } = await params;
  const input = grdCreateSchema.parse(await req.json());
  await requireObraAccess(user.id, workspaceId, input.obraId);
  const grd = await createGrd(workspaceId, user.id, input);
  return NextResponse.json({ data: grd }, { status: 201 });
});
