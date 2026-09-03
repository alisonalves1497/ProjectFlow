import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { withErrorHandling } from "@/lib/errors";
import { itemSuprimentoUpdateSchema } from "@/lib/validators";
import { getItemSuprimentoOrThrow, softDeleteItemSuprimento, updateItemSuprimento } from "@/services/itemSuprimentoService";
import { requireObraAccess } from "@/services/permissions";

type Params = { params: Promise<{ workspaceId: string; itemId: string }> };

export const GET = withErrorHandling(async (_req: Request, { params }: Params) => {
  const user = await requireUser();
  const { workspaceId, itemId } = await params;
  const item = await getItemSuprimentoOrThrow(workspaceId, itemId);
  await requireObraAccess(user.id, workspaceId, item.obraId);
  return NextResponse.json({ data: item });
});

export const PATCH = withErrorHandling(async (req: Request, { params }: Params) => {
  const user = await requireUser();
  const { workspaceId, itemId } = await params;
  const item = await getItemSuprimentoOrThrow(workspaceId, itemId);
  await requireObraAccess(user.id, workspaceId, item.obraId);
  const input = itemSuprimentoUpdateSchema.parse(await req.json());
  const updated = await updateItemSuprimento(workspaceId, itemId, input);
  return NextResponse.json({ data: updated });
});

export const DELETE = withErrorHandling(async (_req: Request, { params }: Params) => {
  const user = await requireUser();
  const { workspaceId, itemId } = await params;
  const item = await getItemSuprimentoOrThrow(workspaceId, itemId);
  await requireObraAccess(user.id, workspaceId, item.obraId);
  await softDeleteItemSuprimento(workspaceId, itemId);
  return new NextResponse(null, { status: 204 });
});
