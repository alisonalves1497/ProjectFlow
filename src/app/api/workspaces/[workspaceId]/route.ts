import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { withErrorHandling } from "@/lib/errors";
import { workspaceUpdateSchema } from "@/lib/validators";
import { getWorkspaceOrThrow, updateWorkspace } from "@/services/workspaceService";
import { requireWorkspaceRole } from "@/services/permissions";

type Params = { params: Promise<{ workspaceId: string }> };

export const GET = withErrorHandling(async (_req: Request, { params }: Params) => {
  const user = await requireUser();
  const { workspaceId } = await params;
  await requireWorkspaceRole(user.id, workspaceId, ["administrador", "coordenador", "lider_aprovador", "analista"]);
  const workspace = await getWorkspaceOrThrow(workspaceId);
  return NextResponse.json({ data: workspace });
});

export const PATCH = withErrorHandling(async (req: Request, { params }: Params) => {
  const user = await requireUser();
  const { workspaceId } = await params;
  await requireWorkspaceRole(user.id, workspaceId, ["administrador", "coordenador"]);
  const input = workspaceUpdateSchema.parse(await req.json());
  const workspace = await updateWorkspace(workspaceId, input);
  return NextResponse.json({ data: workspace });
});
