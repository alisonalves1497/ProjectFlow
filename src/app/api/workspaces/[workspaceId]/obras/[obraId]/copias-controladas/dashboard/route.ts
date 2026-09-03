import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { withErrorHandling } from "@/lib/errors";
import { getCopiasControladasDashboard } from "@/services/copiaControladaService";
import { requireObraAccess } from "@/services/permissions";

type Params = { params: Promise<{ workspaceId: string; obraId: string }> };

export const GET = withErrorHandling(async (_req: Request, { params }: Params) => {
  const user = await requireUser();
  const { workspaceId, obraId } = await params;
  await requireObraAccess(user.id, workspaceId, obraId);
  const dashboard = await getCopiasControladasDashboard(workspaceId, obraId);
  return NextResponse.json({ data: dashboard });
});
