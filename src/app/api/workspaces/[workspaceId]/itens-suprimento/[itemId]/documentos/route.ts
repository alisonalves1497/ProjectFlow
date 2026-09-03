import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/session";
import { withErrorHandling } from "@/lib/errors";
import { attachDocumento, getItemSuprimentoOrThrow, listItemDocumentos } from "@/services/itemSuprimentoService";
import { requireObraAccess } from "@/services/permissions";

type Params = { params: Promise<{ workspaceId: string; itemId: string }> };

const attachSchema = z.object({ documentoId: z.string().trim().min(1) });

export const GET = withErrorHandling(async (_req: Request, { params }: Params) => {
  const user = await requireUser();
  const { workspaceId, itemId } = await params;
  const item = await getItemSuprimentoOrThrow(workspaceId, itemId);
  await requireObraAccess(user.id, workspaceId, item.obraId);
  const documentos = await listItemDocumentos(itemId);
  return NextResponse.json({ data: documentos });
});

export const POST = withErrorHandling(async (req: Request, { params }: Params) => {
  const user = await requireUser();
  const { workspaceId, itemId } = await params;
  const item = await getItemSuprimentoOrThrow(workspaceId, itemId);
  await requireObraAccess(user.id, workspaceId, item.obraId);
  const input = attachSchema.parse(await req.json());
  const link = await attachDocumento(workspaceId, itemId, input.documentoId);
  return NextResponse.json({ data: link }, { status: 201 });
});
