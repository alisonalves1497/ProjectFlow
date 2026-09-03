import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { withErrorHandling } from "@/lib/errors";
import { workspaceCreateSchema } from "@/lib/validators";
import { createWorkspace, listWorkspacesForUser } from "@/services/workspaceService";

export const GET = withErrorHandling(async () => {
  const user = await requireUser();
  const workspaces = await listWorkspacesForUser(user.id);
  return NextResponse.json({ data: workspaces });
});

export const POST = withErrorHandling(async (req: Request) => {
  const user = await requireUser();
  const input = workspaceCreateSchema.parse(await req.json());
  const workspace = await createWorkspace(user.id, input);
  return NextResponse.json({ data: workspace }, { status: 201 });
});
