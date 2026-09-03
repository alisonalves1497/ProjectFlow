import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { withErrorHandling } from "@/lib/errors";
import { getPainelData } from "@/services/painelService";
import { getWorkspaceRole } from "@/services/permissions";
import { forbidden } from "@/lib/errors";

type Params = { params: Promise<{ workspaceId: string }> };

export const GET = withErrorHandling(async (_req: Request, { params }: Params) => {
  const user = await requireUser();
  const { workspaceId } = await params;
  const role = await getWorkspaceRole(user.id, workspaceId);
  if (!role) throw forbidden("WORKSPACE_ACCESS_DENIED", "Você não é membro deste workspace.");

  const painel = await getPainelData(workspaceId, user.id);
  return NextResponse.json({ data: painel });
});
