import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { withErrorHandling } from "@/lib/errors";
import { obraUpdateSchema } from "@/lib/validators";
import { getObraOrThrow, softDeleteObra, updateObra } from "@/services/obraService";
import { requireObraAccess, requireWorkspaceRole } from "@/services/permissions";

type Params = { params: Promise<{ workspaceId: string; projetoId: string; obraId: string }> };

export const GET = withErrorHandling(async (_req: Request, { params }: Params) => {
  const user = await requireUser();
  const { workspaceId, obraId } = await params;
  await requireObraAccess(user.id, workspaceId, obraId);
  const obra = await getObraOrThrow(workspaceId, obraId);
  return NextResponse.json({ data: obra });
});

export const PATCH = withErrorHandling(async (req: Request, { params }: Params) => {
  const user = await requireUser();
  const { workspaceId, obraId } = await params;
  await requireWorkspaceRole(user.id, workspaceId, ["administrador", "coordenador"]);
  const input = obraUpdateSchema.parse(await req.json());
  const obra = await updateObra(workspaceId, obraId, input);
  return NextResponse.json({ data: obra });
});

export const DELETE = withErrorHandling(async (_req: Request, { params }: Params) => {
  const user = await requireUser();
  const { workspaceId, obraId } = await params;
  await requireWorkspaceRole(user.id, workspaceId, ["administrador", "coordenador"]);
  await softDeleteObra(workspaceId, obraId);
  return new NextResponse(null, { status: 204 });
});
