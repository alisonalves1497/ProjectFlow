import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { withErrorHandling } from "@/lib/errors";
import { obraMemberAddSchema } from "@/lib/validators";
import { addObraMember, listObraMembers } from "@/services/obraService";
import { requireObraAccess, requireWorkspaceRole } from "@/services/permissions";

type Params = { params: Promise<{ workspaceId: string; projetoId: string; obraId: string }> };

export const GET = withErrorHandling(async (_req: Request, { params }: Params) => {
  const user = await requireUser();
  const { workspaceId, obraId } = await params;
  await requireObraAccess(user.id, workspaceId, obraId);
  const members = await listObraMembers(obraId);
  return NextResponse.json({ data: members });
});

export const POST = withErrorHandling(async (req: Request, { params }: Params) => {
  const user = await requireUser();
  const { workspaceId, obraId } = await params;
  await requireWorkspaceRole(user.id, workspaceId, ["administrador", "coordenador"]);
  const input = obraMemberAddSchema.parse(await req.json());
  const member = await addObraMember(obraId, input.email);
  return NextResponse.json({ data: member }, { status: 201 });
});
