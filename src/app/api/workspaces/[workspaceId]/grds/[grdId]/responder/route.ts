import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { withErrorHandling } from "@/lib/errors";
import { grdResponderSchema } from "@/lib/validators";
import { getGrdOrThrow, responderGrd } from "@/services/grdService";
import { requireObraAccess } from "@/services/permissions";

type Params = { params: Promise<{ workspaceId: string; grdId: string }> };

export const POST = withErrorHandling(async (req: Request, { params }: Params) => {
  const user = await requireUser();
  const { workspaceId, grdId } = await params;
  const grd = await getGrdOrThrow(workspaceId, grdId);
  await requireObraAccess(user.id, workspaceId, grd.obraId);
  const input = grdResponderSchema.parse(await req.json());
  const atualizado = await responderGrd(workspaceId, grdId, user.id, input);
  return NextResponse.json({ data: atualizado });
});
