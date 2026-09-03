import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { withErrorHandling } from "@/lib/errors";
import { removeObraMember } from "@/services/obraService";
import { requireWorkspaceRole } from "@/services/permissions";

type Params = { params: Promise<{ workspaceId: string; projetoId: string; obraId: string; userId: string }> };

export const DELETE = withErrorHandling(async (_req: Request, { params }: Params) => {
  const user = await requireUser();
  const { workspaceId, obraId, userId } = await params;
  await requireWorkspaceRole(user.id, workspaceId, ["administrador", "coordenador"]);
  await removeObraMember(obraId, userId);
  return new NextResponse(null, { status: 204 });
});
