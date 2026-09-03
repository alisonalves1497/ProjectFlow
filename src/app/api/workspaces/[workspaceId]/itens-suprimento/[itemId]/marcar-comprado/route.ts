import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { withErrorHandling } from "@/lib/errors";
import { marcarCompradoSchema } from "@/lib/validators";
import { getItemSuprimentoOrThrow, marcarComprado } from "@/services/itemSuprimentoService";
import { requireObraAccess } from "@/services/permissions";

type Params = { params: Promise<{ workspaceId: string; itemId: string }> };

export const POST = withErrorHandling(async (req: Request, { params }: Params) => {
  const user = await requireUser();
  const { workspaceId, itemId } = await params;
  const item = await getItemSuprimentoOrThrow(workspaceId, itemId);
  await requireObraAccess(user.id, workspaceId, item.obraId);
  const body = await req.json().catch(() => ({}));
  const input = marcarCompradoSchema.parse(body);
  const updated = await marcarComprado(workspaceId, itemId, input.compradoEm);
  return NextResponse.json({ data: updated });
});
