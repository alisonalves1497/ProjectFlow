import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { withErrorHandling } from "@/lib/errors";
import { obraCreateSchema } from "@/lib/validators";
import { createObra, listAccessibleObraIds, listObras } from "@/services/obraService";
import { requireWorkspaceRole } from "@/services/permissions";

type Params = { params: Promise<{ workspaceId: string; projetoId: string }> };

export const GET = withErrorHandling(async (_req: Request, { params }: Params) => {
  const user = await requireUser();
  const { workspaceId, projetoId } = await params;
  const role = await requireWorkspaceRole(user.id, workspaceId, ["administrador", "coordenador", "lider_aprovador", "analista"]);

  const obras = await listObras(workspaceId, projetoId);
  if (role === "administrador") {
    return NextResponse.json({ data: obras });
  }
  const accessibleIds = new Set(await listAccessibleObraIds(user.id));
  return NextResponse.json({ data: obras.filter((o) => accessibleIds.has(o.id)) });
});

export const POST = withErrorHandling(async (req: Request, { params }: Params) => {
  const user = await requireUser();
  const { workspaceId, projetoId } = await params;
  await requireWorkspaceRole(user.id, workspaceId, ["administrador", "coordenador"]);
  const input = obraCreateSchema.parse(await req.json());
  const obra = await createObra(workspaceId, projetoId, input, user.id);
  return NextResponse.json({ data: obra }, { status: 201 });
});
