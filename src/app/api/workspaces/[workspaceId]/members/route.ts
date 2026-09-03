import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { withErrorHandling } from "@/lib/errors";
import { workspaceMemberAddSchema } from "@/lib/validators";
import { addWorkspaceMember, listWorkspaceMembers } from "@/services/workspaceService";
import { requireWorkspaceRole } from "@/services/permissions";

type Params = { params: Promise<{ workspaceId: string }> };

export const GET = withErrorHandling(async (_req: Request, { params }: Params) => {
  const user = await requireUser();
  const { workspaceId } = await params;
  await requireWorkspaceRole(user.id, workspaceId, ["administrador", "coordenador", "lider_aprovador", "analista"]);
  const members = await listWorkspaceMembers(workspaceId);
  return NextResponse.json({ data: members });
});

export const POST = withErrorHandling(async (req: Request, { params }: Params) => {
  const user = await requireUser();
  const { workspaceId } = await params;
  await requireWorkspaceRole(user.id, workspaceId, ["administrador", "coordenador"]);
  const input = workspaceMemberAddSchema.parse(await req.json());
  const member = await addWorkspaceMember(workspaceId, input);
  return NextResponse.json({ data: member }, { status: 201 });
});
