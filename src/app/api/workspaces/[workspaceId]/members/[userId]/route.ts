import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { withErrorHandling } from "@/lib/errors";
import { workspaceMemberRoleUpdateSchema } from "@/lib/validators";
import { removeWorkspaceMember, updateWorkspaceMemberRole } from "@/services/workspaceService";
import { requireWorkspaceRole } from "@/services/permissions";

type Params = { params: Promise<{ workspaceId: string; userId: string }> };

export const PATCH = withErrorHandling(async (req: Request, { params }: Params) => {
  const user = await requireUser();
  const { workspaceId, userId } = await params;
  await requireWorkspaceRole(user.id, workspaceId, ["administrador"]);
  const input = workspaceMemberRoleUpdateSchema.parse(await req.json());
  const member = await updateWorkspaceMemberRole(workspaceId, userId, input.role);
  return NextResponse.json({ data: member });
});

export const DELETE = withErrorHandling(async (_req: Request, { params }: Params) => {
  const user = await requireUser();
  const { workspaceId, userId } = await params;
  await requireWorkspaceRole(user.id, workspaceId, ["administrador", "coordenador"]);
  await removeWorkspaceMember(workspaceId, userId);
  return new NextResponse(null, { status: 204 });
});
