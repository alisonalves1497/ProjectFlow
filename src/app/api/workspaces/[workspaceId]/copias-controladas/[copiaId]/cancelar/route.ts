import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { withErrorHandling } from "@/lib/errors";
import { getCopiaControladaOrThrow, cancelarCopiaControlada } from "@/services/copiaControladaService";
import { requireObraAccess } from "@/services/permissions";

type Params = { params: Promise<{ workspaceId: string; copiaId: string }> };

export const POST = withErrorHandling(async (_req: Request, { params }: Params) => {
  const user = await requireUser();
  const { workspaceId, copiaId } = await params;
  const copia = await getCopiaControladaOrThrow(workspaceId, copiaId);
  await requireObraAccess(user.id, workspaceId, copia.obraId);
  const atualizada = await cancelarCopiaControlada(workspaceId, user.id, copiaId);
  return NextResponse.json({ data: atualizada });
});
